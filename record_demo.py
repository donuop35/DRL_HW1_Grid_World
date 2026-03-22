from playwright.sync_api import sync_playwright
import time
import os

def run():
    print("啟動自動化錄影程序...")
    os.makedirs("demo_video", exist_ok=True)
    
    with sync_playwright() as p:
        # Launch headless chromium
        browser = p.chromium.launch(headless=True)
        # Create a new context with video recording enabled
        context = browser.new_context(
            record_video_dir="demo_video/",
            record_video_size={"width": 1280, "height": 800}
        )
        page = context.new_page()
        
        print("1. 導覽至 http://127.0.0.1:5000")
        page.goto("http://127.0.0.1:5000", wait_until="networkidle")
        page.wait_for_selector(".grid-cell", timeout=5000)
        
        # Make sure grid size is 5
        page.fill("#gridSize", "5")
        page.click("#generateGridBtn")
        time.sleep(1) # wait for render
        
        cells = page.query_selector_all(".grid-cell")
        
        print("2. 設置起始點、終點與障礙物")
        # Click start (0)
        cells[0].click()
        time.sleep(0.5)
        # Click end (24)
        cells[24].click()
        time.sleep(0.5)
        # Click obstacles
        cells[11].click()
        time.sleep(0.3)
        cells[12].click()
        time.sleep(0.3)
        cells[13].click()
        time.sleep(0.5)
        
        print("3. 按下 Generate Policy")
        page.click("#policyGenBtn")
        time.sleep(1.5)
        
        print("4. 按下 Evaluate Policy")
        page.click("#policyEvalBtn")
        time.sleep(2.5) # Wait for iterative evaluation heatmap
        
        print("5. 按下 Find Optimal Policy")
        page.click("#valueIterBtn")
        time.sleep(3) # Wait for value iteration to trace optimal path
        
        print("6. 切換視圖至 View Value")
        page.click("#viewValueBtn")
        time.sleep(2)
        
        print("7. 切回視圖至 View Policy")
        page.click("#viewPolicyBtn")
        time.sleep(2)
        
        print("操作完畢，正在儲存錄影檔...")
        # Closing context saves the video
        context.close()
        browser.close()
        print("錄影檔已成功儲存至 demo_video/ 資料夾下！")

if __name__ == "__main__":
    run()
