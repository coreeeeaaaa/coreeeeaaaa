#!/usr/bin/env node

// 모든 명령어 실행 전 강제로 실행되는 헌법 적용 훅
const { spawn } = require('child_process');
const path = require('path');

function runEnforcer(command) {
  return new Promise((resolve, reject) => {
    const enforcerPath = path.join(__dirname, '../commands/enforcer.js');

    const enforcer = spawn('node', [enforcerPath, command], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';

    enforcer.stdout.on('data', (data) => {
      output += data.toString();
    });

    enforcer.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    enforcer.on('close', (code) => {
      if (code === 0) {
        resolve({
          output: output.trim(),
          error: errorOutput.trim()
        });
      } else {
        reject(new Error(`헌법 적용 실패: ${errorOutput}`));
      }
    });
  });
}

async function enforceBeforeCommand(command, args) {
  try {
    console.log('⚖️ 명령어 전 헌법 적용 중...');

    const result = await runEnforcer(command);

    if (result.output) {
      console.log(result.output);
    }

    return result;
  } catch (error) {
    console.error('❌ 헌법 적용 실패:', error.message);

    // 심각하지 않은 오류면 계속 진행
    if (error.message.includes('헌법 적용 실패')) {
      console.log('⚠️ 경고: 헌법 적용에 문제가 있지만 작업은 계속합니다.');
      return null;
    }

    throw error;
  }
}

// 명령어 래퍼 수정을 위한 감시 모드
function wrapCommand(originalCommand) {
  return async (...args) => {
    const commandName = args[0] || 'unknown';

    // 헌법 적용
    await enforceBeforeCommand(commandName, args);

    // 원래 명령어 실행
    return originalCommand(...args);
  };
}

// 내보내기
module.exports = {
  enforceBeforeCommand,
  wrapCommand
};