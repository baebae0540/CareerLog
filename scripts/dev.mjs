// pnpm dev: Next.js 개발 서버를 띄우고, 준비되면 기본 브라우저로 주소를 연다.
// 맥·윈도우 공통. 브라우저를 열지 않으려면 pnpm dev:quiet
// 종료는 이 터미널에서 Ctrl+C.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

// 셸을 거치지 않고 node로 next를 직접 실행한다 (OS 차이 없음)
const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: ["inherit", "pipe", "inherit"],
  env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" },
});

let url;
let opened = false;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk); // Next 출력은 그대로 보여준다
  const text = stripAnsi(chunk.toString());
  // 포트가 3000이 아닐 수도 있으니 Next가 알려주는 주소를 쓴다
  url ??= text.match(/Local:\s+(https?:\/\/\S+)/)?.[1];
  if (!opened && url && /Ready/.test(text)) {
    opened = true;
    openBrowser(url);
  }
});

function openBrowser(target) {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [target]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", target]]
        : ["xdg-open", [target]];
  spawn(cmd, args, { stdio: "ignore", detached: true })
    .on("error", () => console.log(`\n브라우저를 열지 못했습니다. 직접 여세요: ${target}\n`))
    .unref();
}

// Ctrl+C는 같은 터미널의 next에도 전달된다. next가 끝나면 이 스크립트도 끝낸다.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
