import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

function App() {
  // @ts-ignore
  const [intensity, setIntensity] = useState(30);
  const [isJittering, setIsJittering] = useState(false);
  // @ts-ignore
  const [duration, setDuration] = useState(30);
  const [remindCount, setRemindCount] = useState(duration);

  const [tip, setTip] = useState("当你无法精准控制身体\n是什么感受");

  useEffect(() => {
    // 监听更新剩余时间的事件
    const unlistenUpdate = listen("update-remind-count", (event) => {
      setRemindCount(event.payload as number); // 更新 remindCount
    });

    // 监听抖动完成的事件
    const unlistenComplete = listen("jitter-complete", () => {
      setIsJittering(false); // 设置抖动状态为 false
      setRemindCount(duration); // 重置倒计时
    });

    // 清理监听器
    return () => {
      unlistenUpdate.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []);

  const handlePlay = () => {
    if (isJittering) {
      // 如果正在抖动，则停止
      invoke("stop_jitter")
        .then(() => {
          setTip("当你无法精准控制身体\n是什么感受");
          setIsJittering(false);
        })
        .catch((err) => {
          console.error("Error stopping jitter:", err);
        });
    } else {
      // 开始抖动
      setIsJittering(true);
      setRemindCount(duration);
      setTip("试着点击暂停⏸");

      invoke("jitter_mouse", { duration, intensity })
        .then(() => {
          console.log("Mouse jitter complete");
        })
        .catch((err) => {
          console.error("Error:", err);
          setIsJittering(false);
        });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="mt-4 text-center text-gray-400 text-xs whitespace-pre">
          {tip}
        </div>

        <div className="relative">
          {/* Play button with glow effect */}
          <div className="absolute -inset-4 bg-blue-300/30 rounded-full blur-xl"></div>
          <button
            onClick={handlePlay}
            title="开始"
            className={`relative  ${
              isJittering ? "w-12 h-12" : "w-24 h-24"
            }  rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-blue-50 transition-colors`}
          >
            {isJittering ? (
              // 暂停图标
              <div className="flex space-x-1">
                <div className="w-2 h-6 bg-blue-300" />
                <div className="w-2 h-6 bg-blue-300" />
              </div>
            ) : (
              // 开始图标
              <div className="w-0 h-0 border-l-[20px] border-l-blue-500 border-y-[12px] border-y-transparent ml-2"></div>
            )}
          </button>
        </div>

        {/* Timer display */}
        <div className="text-4xl font-medium text-gray-700">{remindCount}</div>
      </div>
    </main>
  );
}

export default App;
