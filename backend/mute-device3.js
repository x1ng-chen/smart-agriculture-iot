// Quick script: mute device 3 buzzer
import { sendCommand } from './src/huawei-iot.js';

const DEVICE_ID = '6a16b4f97f2e6c302f74fe36_smart-003';

async function main() {
  console.log('Sending SecurityControl Beep=OFF to smart-003...');
  const ok = await sendCommand(DEVICE_ID, 'SecurityControl', { Beep: 'OFF' });
  console.log(ok ? '✅ Mute sent!' : '❌ Failed');
  process.exit(ok ? 0 : 1);
}
main();
