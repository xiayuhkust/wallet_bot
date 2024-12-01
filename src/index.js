const { spawn } = require("child_process");
const path = require("path");

// 修正路径以指向当前文件夹
const scripts = [
  { name: "Register Commands", file: path.join(__dirname, "register-commands.js") },
  { name: "Start Bot", file: path.join(__dirname, "bot.js") },
];

(async () => {
  for (const script of scripts) {
    console.log(`[INFO] Starting: ${script.name} (${script.file})`);
    try {
      await runScript(script.file);
      console.log(`[SUCCESS] Completed: ${script.name}`);
    } catch (error) {
      console.error(`[ERROR] Failed: ${script.name}`);
      console.error(error);
      process.exit(1); // 终止运行
    }
  }
})();

function runScript(file) {
  return new Promise((resolve, reject) => {
    const process = spawn("node", [file], { stdio: "inherit" });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${file} exited with code ${code}`));
      }
    });
  });
}
