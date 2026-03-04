import { chromium } from 'playwright';
import path from 'path';

const baseUrl = 'http://localhost:3200';
const screenshotDir = '/Users/qiliangli/Documents/Coding/ateam/docs/images';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🎭 Launching Playwright...');
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('status') || text.includes('Status') || text.includes('agent') || text.includes('Agent')) {
      console.log(`📜 Page: ${text}`);
    }
  });
  
  try {
    console.log(`\n📍 Step 1: Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { timeout: 10000 });
    await sleep(2000);
    
    // Screenshot 1: Initial state
    const initialScreenshot = path.join(screenshotDir, 'test-a2a-status-initial.png');
    await page.screenshot({ path: initialScreenshot, fullPage: true });
    console.log(`📸 Screenshot saved: ${initialScreenshot}`);
    
    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);
    
    // Check connection status
    const statusText = await page.locator('#statusText').textContent().catch(() => 'N/A');
    console.log(`🔌 Connection status: ${statusText}`);
    
    // Wait for connection to establish
    console.log('⏳ Waiting for connection to establish...');
    await sleep(3000);
    
    // Look for cat members
    console.log('\n🐱 Looking for cat member list...');
    const catsElement = await page.locator('#cats').first();
    const catsExists = await catsElement.isVisible().catch(() => false);
    console.log(`   Cats element visible: ${catsExists}`);
    
    // Get all cat items
    const catItems = await page.locator('.cat-item').all().catch(() => []);
    console.log(`   Found ${catItems.length} cat items`);
    
    for (let i = 0; i < catItems.length; i++) {
      const catText = await catItems[i].textContent().catch(() => 'N/A');
      const catId = await catItems[i].getAttribute('data-cat').catch(() => 'N/A');
      const catSelected = await catItems[i].getAttribute('data-selected').catch(() => 'N/A');
      console.log(`   - Cat ${i + 1}: id="${catId}" selected="${catSelected}" text="${catText?.trim()}"`);
    }
    
    // Look for new session button
    console.log('\n🔘 Looking for new session button...');
    const newSessionButton = page.locator('#newSessionBtn');
    const hasNewSession = await newSessionButton.isVisible().catch(() => false);
    
    if (hasNewSession) {
      console.log('✅ Found new session button, clicking...');
      await newSessionButton.click();
      await sleep(2000);
      
      const newSessionScreenshot = path.join(screenshotDir, 'test-a2a-status-after-new-session.png');
      await page.screenshot({ path: newSessionScreenshot, fullPage: true });
      console.log(`📸 Screenshot saved: ${newSessionScreenshot}`);
    } else {
      console.log('ℹ️ No new session button found');
    }
    
    // Look for message input (textarea with id="prompt")
    console.log('\n💬 Looking for message input...');
    const messageInput = page.locator('#prompt');
    const hasInput = await messageInput.isVisible().catch(() => false);
    console.log(`   Input visible: ${hasInput}`);
    
    // Find send button (id="runBtn")
    const sendButton = page.locator('#runBtn');
    
    if (hasInput) {
      // Send A2A message
      const testMessage = '@opus say hello from the test';
      console.log(`\n📤 Sending A2A message: "${testMessage}"`);
      
      await messageInput.click();
      await messageInput.fill(testMessage);
      await sleep(500);
      
      // Screenshot before sending
      const beforeSendScreenshot = path.join(screenshotDir, 'test-a2a-status-before-send.png');
      await page.screenshot({ path: beforeSendScreenshot, fullPage: true });
      console.log(`📸 Screenshot saved: ${beforeSendScreenshot}`);
      
      // Click send
      await sendButton.click();
      
      console.log('⏳ Waiting for response (5s)...');
      await sleep(5000); // Wait for response
      
      // Screenshot after sending
      const afterSendScreenshot = path.join(screenshotDir, 'test-a2a-status-after-send.png');
      await page.screenshot({ path: afterSendScreenshot, fullPage: true });
      console.log(`📸 Screenshot saved: ${afterSendScreenshot}`);
      
      // Check for status indicators in DOM
      console.log('\n🔍 Checking for status indicators in DOM...');
      const statusCheck = await page.evaluate(() => {
        const statusIndicators = document.querySelectorAll('.status-indicator, [data-status-indicator]');
        const allWithStatusClass = document.querySelectorAll('[class*="status"]');
        return {
          statusIndicatorCount: statusIndicators.length,
          allStatusCount: allWithStatusClass.length,
          statusClasses: Array.from(statusIndicators).map(el => ({
            className: el.className,
            textContent: el.textContent?.substring(0, 50),
            id: el.id
          })),
          allStatusElements: Array.from(allWithStatusClass).slice(0, 10).map(el => ({
            className: el.className,
            textContent: el.textContent?.substring(0, 30)
          }))
        };
      });
      
      console.log(`   .status-indicator elements: ${statusCheck.statusIndicatorCount}`);
      console.log(`   [class*="status"] elements: ${statusCheck.allStatusCount}`);
      
      if (statusCheck.statusIndicatorCount > 0) {
        statusCheck.statusClasses.forEach((item, i) => {
          console.log(`   - ${i + 1}: class="${item.className}" text="${item.textContent}" id="${item.id}"`);
        });
      } else {
        console.log('   ⚠️ No .status-indicator elements found!');
        console.log('   Other status-related elements:');
        statusCheck.allStatusElements.forEach((item, i) => {
          if (item.className.includes('status') || item.className.includes('thinking')) {
            console.log(`   - ${i + 1}: class="${item.className}" text="${item.textContent}"`);
          }
        });
      }
      
      // Check for messages in the chat log
      console.log('\n💬 Checking for messages in chat log...');
      const messagesCheck = await page.evaluate(() => {
        const chatLog = document.querySelector('#log, .chat-log');
        if (!chatLog) return { error: 'No chat log found' };
        
        const messages = Array.from(chatLog.children);
        return {
          messageCount: messages.length,
          messages: messages.map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            textContent: el.textContent?.substring(0, 100),
            hasStatusIndicator: el.querySelector('.status-indicator') !== null,
            innerHTML: el.innerHTML.substring(0, 300)
          }))
        };
      });
      
      if (messagesCheck.error) {
        console.log(`   ⚠️ ${messagesCheck.error}`);
      } else {
        console.log(`   Found ${messagesCheck.messageCount} message elements`);
        messagesCheck.messages.forEach((msg, i) => {
          const hasStatus = msg.hasStatusIndicator ? '✅ has status' : '❌ no status';
          console.log(`   - Message ${i + 1}: ${msg.tagName}#${msg.id} class="${msg.className}" ${hasStatus}`);
          console.log(`     Text: ${msg.textContent.substring(0, 50)}...`);
        });
      }
      
      // Wait longer for more updates
      console.log('\n⏳ Waiting 5 more seconds for status updates...');
      await sleep(5000);
      
      // Final screenshot
      const finalScreenshot = path.join(screenshotDir, 'test-a2a-status-final.png');
      await page.screenshot({ path: finalScreenshot, fullPage: true });
      console.log(`📸 Screenshot saved: ${finalScreenshot}`);
      
      // Re-check status indicators
      const finalStatusCheck = await page.evaluate(() => {
        const statusIndicators = document.querySelectorAll('.status-indicator');
        const thinking = document.querySelectorAll('[class*="thinking"]');
        const progress = document.querySelectorAll('[class*="progress"]');
        
        return {
          statusIndicatorCount: statusIndicators.length,
          thinkingCount: thinking.length,
          progressCount: progress.length
        };
      });
      
      console.log('\n📊 Final status check:');
      console.log(`   .status-indicator: ${finalStatusCheck.statusIndicatorCount}`);
      console.log(`   [class*="thinking"]: ${finalStatusCheck.thinkingCount}`);
      console.log(`   [class*="progress"]: ${finalStatusCheck.progressCount}`);
      
      // Get full HTML of chat log for debugging
      console.log('\n🔍 Examining chat log structure...');
      const chatLogStructure = await page.evaluate(() => {
        const chatLog = document.querySelector('#log');
        if (!chatLog) return { error: 'No #log element' };
        
        return {
          innerHTML: chatLog.innerHTML.substring(0, 2000)
        };
      });
      
      if (chatLogStructure.error) {
        console.log(`   ${chatLogStructure.error}`);
      } else {
        console.log(`   Chat log HTML (first 2000 chars):\n${chatLogStructure.innerHTML}`);
      }
      
    } else {
      console.log('⚠️ Could not find message input, aborting test');
    }
    
  } catch (error) {
    console.error(`❌ Error during test: ${error.message}`);
    const errorScreenshot = path.join(screenshotDir, 'test-a2a-status-error.png');
    await page.screenshot({ path: errorScreenshot, fullPage: true });
    console.log(`📸 Error screenshot saved: ${errorScreenshot}`);
  } finally {
    await sleep(2000);
    await browser.close();
    console.log('\n✅ Test completed');
  }
}

main().catch(console.error);
