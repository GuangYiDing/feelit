// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use autopilot::{mouse, screen};
use rand::Rng;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use tauri::Emitter;
use once_cell::sync::Lazy;

// 存储正在运行的线程的终止标志
static SHOULD_STOP: Lazy<Arc<AtomicBool>> = Lazy::new(|| Arc::new(AtomicBool::new(false)));

#[tauri::command]
fn jitter_mouse(app: AppHandle, duration: u64, intensity: f64) {
    // 重置终止标志
    SHOULD_STOP.store(false, Ordering::SeqCst);
    
    // 在新线程中运行鼠标抖动逻辑
    std::thread::spawn(move || {
        let mut rng = rand::thread_rng();
        let start_time = std::time::Instant::now();

        // 获取屏幕尺寸
        let screen_size = screen::size();
        let screen_width = screen_size.width;
        let screen_height = screen_size.height;

        while start_time.elapsed().as_secs() < duration && !SHOULD_STOP.load(Ordering::SeqCst) {
            let x_offset: f64 = rng.gen_range(-intensity..intensity);
            let y_offset: f64 = rng.gen_range(-intensity..intensity);

            let current_position = mouse::location();

            // 计算新坐标，并确保在屏幕范围内
            let new_x = (current_position.x + x_offset).clamp(0.0, screen_width);
            let new_y = (current_position.y + y_offset).clamp(0.0, screen_height);

            let new_position = autopilot::geometry::Point { x: new_x, y: new_y };

            // 移动鼠标
            if let Err(err) = mouse::move_to(new_position) {
                eprintln!("Failed to move mouse: {:?}", err);
            }
            
            // 计算剩余时间
            let remaining_time = duration - start_time.elapsed().as_secs();

            // 发送事件，通知前端更新状态
            app.emit("update-remind-count", remaining_time).unwrap();

            std::thread::sleep(Duration::from_millis(remaining_time)); // 控制抖动速度
        }
        
        app.emit("update-remind-count", 0).unwrap();
        app.emit("jitter-complete", true).unwrap();
    });
}

#[tauri::command]
fn stop_jitter() {
    SHOULD_STOP.store(true, Ordering::SeqCst);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![jitter_mouse, stop_jitter])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
