/**
 * Debug test for SSE status events
 * This test bypasses the UI and directly calls the API to trigger SSE events
 */

const { test, expect } = require('@playwright/test');

// The init script that will be injected BEFORE the page loads
const SSE_DEBUG_INIT_SCRIPT = `
  window.sseDebugEvents = [];

  // Store the original EventSource
  const OriginalEventSource = window.EventSource;

  window.EventSource = function(url, ...args) {
    console.log('[SSE Debug] Creating EventSource for:', url);
    const es = new OriginalEventSource(url, ...args);
    window.debugEventSource = es;

    // Set up message listener BEFORE the app sets onmessage
    es.addEventListener('message', (event) => {
      const data = event.data;
      console.log('[SSE Debug] *** addEventListener(message) FIRED *** data:', data?.substring(0, 300));

      // Parse and store
      try {
        const parsed = JSON.parse(data);
        console.log('[SSE Debug] Parsed type:', parsed.type);

        window.sseDebugEvents.push({
          source: 'sse-message',
          payload: parsed,
          raw: data,
          timestamp: new Date().toISOString()
        });

        if (parsed.type === 'status') {
          console.log('[SSE Debug] *** STATUS EVENT ***:', parsed);
        }
      } catch (e) {
        console.log('[SSE Debug] Parse error:', e.message);
        window.sseDebugEvents.push({
          source: 'sse-message',
          raw: data,
          error: e.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Capture open event
    es.addEventListener('open', () => {
      console.log('[SSE Debug] Connection OPENED for', url);
      window.sseDebugEvents.push({
        source: 'sse-open',
        url: url,
        timestamp: new Date().toISOString()
      });
    });

    // Capture errors
    es.addEventListener('error', (err) => {
      console.error('[SSE Debug] Error:', err);
      window.sseDebugEvents.push({
        source: 'sse-error',
        error: String(err),
        timestamp: new Date().toISOString()
      });
    });

    return es;
  };

  console.log('[SSE Debug] EventSource patch installed');
`;

test.describe('SSE Status Event Debug', () => {

  test('direct API call to trigger SSE events', async ({ page, context }) => {
    // Enable detailed console logging
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Capture all network requests
    const networkRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        console.log(`[Network] ${request.method()} ${url}`);
        networkRequests.push({
          type: 'request',
          method: request.method(),
          url: url,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Install the init script BEFORE navigating
    await context.addInitScript(SSE_DEBUG_INIT_SCRIPT);
    await page.addInitScript(SSE_DEBUG_INIT_SCRIPT);

    // Navigate
    await page.goto('http://localhost:3200', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Get or create a session ID
    const sessionId = await page.evaluate(async () => {
      // If there's a current session, use it
      if (window.currentSessionId) {
        return window.currentSessionId;
      }

      // Otherwise, check SessionManager
      if (window.SessionManager) {
        const sessions = await window.SessionManager.getAllSessions();
        if (sessions.length > 0) {
          return sessions[0].id;
        }
        // Create new session
        const session = await window.SessionManager.createSession();
        return session.id;
      }

      return 'test-session-' + Date.now();
    });

    console.log('[Debug] Using session ID:', sessionId);

    // Connect to the SSE stream for this session using the app's connectStream
    await page.evaluate((id) => {
      if (window.connectStream && typeof window.connectStream === 'function') {
        console.log('[Debug] Calling connectStream with:', id);
        window.connectStream(id);
      } else {
        console.log('[Debug] connectStream not available');
      }
    }, sessionId);

    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'docs/images/debug-sse-01-connected.png' });

    // Clear network requests before sending
    networkRequests.length = 0;

    // Directly call the /api/run endpoint
    console.log('[Debug] Calling /api/run directly...');

    const response = await page.evaluate(async (id) => {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: id,
          cats: ['opus'],
          prompt: 'say hello'
        })
      });
      return {
        status: res.status,
        ok: res.ok,
        statusText: res.statusText
      };
    }, sessionId);

    console.log('[Debug] /api/run response:', response);

    await page.screenshot({ path: 'docs/images/debug-sse-02-after-api-call.png' });

    // Wait for SSE events
    console.log('[Debug] Waiting for SSE events...');
    let lastCount = 0;
    let noNewCount = 0;

    for (let i = 0; i < 180; i++) {  // Up to 90 seconds
      await page.waitForTimeout(500);

      const events = await page.evaluate(() => window.sseDebugEvents || []);
      const count = events.length;

      if (count > lastCount) {
        console.log(`[Debug] Events: ${count} (new: ${count - lastCount})`);
        lastCount = count;
        noNewCount = 0;

        // Show all events
        events.forEach((ev, idx) => {
          if (ev.payload) {
            console.log(`[Debug] Event ${idx + 1}: type=${ev.payload.type}`, ev.payload);
          } else {
            console.log(`[Debug] Event ${idx + 1}: source=${ev.source}`, ev);
          }
        });
      } else {
        noNewCount++;
      }

      // Check for any event type
      const hasAnyEvent = events.some(e => e.payload);
      if (hasAnyEvent && noNewCount > 20) {
        console.log('[Debug] Got some events, waiting 10s more to ensure all captured...');
        await page.waitForTimeout(10000);
        break;
      }

      if (noNewCount > 40) {
        console.log('[Debug] No new events for 20 seconds');
        break;
      }
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/images/debug-sse-03-final.png' });
    await page.screenshot({ path: 'docs/images/debug-sse-04-full.png', fullPage: true });

    // Get all captured events
    const allEvents = await page.evaluate(() => window.sseDebugEvents || []);

    console.log('\n========================================');
    console.log('FINAL SSE EVENT SUMMARY');
    console.log('========================================');
    console.log(`Total events captured: ${allEvents.length}`);

    const bySource = {};
    allEvents.forEach(ev => {
      const source = ev.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    });

    console.log('\nBy source:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });

    const statusEvents = allEvents.filter(e => e.payload && e.payload.type === 'status');
    console.log(`\nStatus events: ${statusEvents.length}`);
    statusEvents.forEach((ev, i) => {
      console.log(`  ${i + 1}. catId=${ev.payload.catId}, status=${ev.payload.status}, detail=${ev.payload.detail}`);
    });

    const cliEvents = allEvents.filter(e => e.payload && e.payload.type === 'cli');
    console.log(`\nCLI events: ${cliEvents.length}`);

    const systemEvents = allEvents.filter(e => e.payload && e.payload.type === 'system');
    console.log(`\nSystem events: ${systemEvents.length}`);

    console.log('\nAll events:');
    allEvents.forEach((ev, i) => {
      if (ev.payload) {
        const p = ev.payload;
        if (p.type === 'status') {
          console.log(`  ${i + 1}. [${ev.source}] type=${p.type}, catId=${p.catId}, status=${p.status}, detail=${p.detail}`);
        } else if (p.type === 'cli') {
          console.log(`  ${i + 1}. [${ev.source}] type=${p.type}, catId=${p.catId}, text="${p.text?.substring(0, 50)}..."`);
        } else if (p.type === 'system') {
          console.log(`  ${i + 1}. [${ev.source}] type=${p.type}, message="${p.message}"`);
        } else {
          console.log(`  ${i + 1}. [${ev.source}] type=${p.type}`, p);
        }
      } else {
        console.log(`  ${i + 1}. [${ev.source}]`, ev);
      }
    });
    console.log('========================================\n');

    console.log('\nNetwork requests:');
    networkRequests.forEach(req => {
      console.log(`  ${req.type.toUpperCase()} ${req.method || ''} ${req.url} ${req.status || ''}`);
    });
    console.log('========================================\n');

    // Save to file
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/qiliangli/Documents/Coding/ateam/data/sse-events-captured.json',
      JSON.stringify({ events: allEvents, network: networkRequests, sessionId }, null, 2)
    );
    console.log('[Debug] Saved to data/sse-events-captured.json');

    // Check UI state
    const statusIndicators = await page.locator('.status-indicator').all();
    console.log(`\n[Debug] Status indicators in DOM: ${statusIndicators.length}`);

    for (let i = 0; i < Math.min(statusIndicators.length, 5); i++) {
      const text = await statusIndicators[i].textContent();
      const visible = await statusIndicators[i].isVisible();
      console.log(`  Indicator ${i + 1}: text="${text}", visible=${visible}`);
    }

    // Check for any messages in the log
    const messages = await page.locator('.message-row').all();
    console.log(`\n[Debug] Message rows in DOM: ${messages.length}`);

    // Key findings
    const hadRunRequest = networkRequests.some(r => r.url.includes('/api/run'));
    const hadSSEEvents = allEvents.some(e => e.payload);
    const hadStatusEvents = statusEvents.length > 0;

    console.log('\n========================================');
    console.log('KEY FINDINGS');
    console.log('========================================');
    console.log(`/api/run request sent: ${hadRunRequest}`);
    console.log(`SSE payload events received: ${hadSSEEvents}`);
    console.log(`Status events received: ${hadStatusEvents}`);
    console.log('========================================\n');

    expect(true).toBe(true);
  });

});
