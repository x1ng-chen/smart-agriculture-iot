// SmartAg PPTX Final — All slides properly sized
const JSZip = require('../backend/node_modules/jszip');
const fs = require('fs');
const SRC = '../docs/smart-ag-report_backup.pptx';
const OUT = '../docs/smart-ag-report.pptx';
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }
function replaceTexts(xml, arr) {
  let i = 0;
  return xml.replace(/(<a:t[^>]*>)[^<]*(<\/a:t>)/g, (m, open, close) => {
    if (i < arr.length && arr[i] != null) return open + esc(arr[i++]) + close;
    i++; return m;
  });
}
function expandShapes(xml, exps) {
  const re = /<p:sp>[\s\S]*?<\/p:sp>/g; let idx = 0;
  return xml.replace(re, (sp) => {
    const e = exps.find(x => x.i === idx); idx++;
    return e ? sp.replace(/(<a:ext cx="\d+" cy=")\d+("\/>)/, '$1'+e.cy+'$2') : sp;
  });
}

async function main() {
  const buf = fs.readFileSync(SRC);
  const zip = await JSZip.loadAsync(buf);
  const T = {};
  for (const n of [10,12,14,18,25]) T[n] = await zip.file('ppt/slides/slide'+n+'.xml').async('string');

  // Update existing
  for (const [n, reps] of Object.entries({
    7:{'MQTT':'Socket.io','ws://localhost:8083/mqtt':'ws://localhost:8080/ws'},
    13:{'Aedes MQTT Broker':'Socket.io WebSocket'},
    14:{'MQTT Broker':'Socket.io','mqtt-broker.js':'ws-server.js'},
    25:{'MQTT/WS':'Socket.io/WS'}
  })) {
    let x = await zip.file('ppt/slides/slide'+n+'.xml').async('string');
    for (const [o,nw] of Object.entries(reps)) if (x.includes(o)) x = x.replaceAll(o,nw);
    zip.file('ppt/slides/slide'+n+'.xml', x);
  }
  console.log('Existing slides updated');

  // ===== S13: InfluxDB (T10: 4 horizontal rows, 18 elements) =====
  let s13 = replaceTexts(T[10], [
    'InfluxDB 2.7 时序数据库 — 海量传感器数据存储',
    '4 个 Measurement | 下采样聚合 | 自动过期 | float 字段类型统一修复',
    'sensor_data — 传感器数据',
    '5 个 float 字段: soil_moisture / soil_temp / air_temp / air_humidity / light',
    'Tags: device_id + device_sn | 30s 写入 | 字段修复: writePoint() 强制 floatField',
    'irrigation_logs — 灌溉记录',
    '灌溉开始/停止 | trigger_type: manual/auto/scheduled',
    'water_used_l 自动计算 | 关联 strategy_id + operator_id',
    'duration_sec / end_time / remark 完整审计',
    'alerts — 告警事件',
    'alert_type + alert_level (info/warning/danger) | resolved 状态位',
    '30min 冷却防重复 | 来自 alert-engine + anomaly-detector',
    'WebSocket 实时推送 alert:new 事件到前端 Dashboard',
    'WebSocket 实时推送前端 Dashboard',
    'ai_anomalies — AI 异常检测',
    'z_score + severity + expected_range + current_value',
    '2h 聚合窗口 | 线性回归趋势 | 关联 anomaly_type + field_name',
    'AI 决策引擎输出置信度 + 建议操作',
  ]);
  s13 = expandShapes(s13, [{i:3,cy:'1651000'},{i:5,cy:'1397000'},{i:7,cy:'1651000'},{i:9,cy:'1651000'}]);

  // ===== S20: AI Decision (T18: 2-column, 55 elements) =====
  let s20 = replaceTexts(T[18], [
    'AI 决策引擎 — MiMo AI 智能灌溉决策',
    'ai-decision-engine.js + feature-extractor.js | 2h 聚合 + 线性回归 + Prompt + 5min 冷却',
    'ai-decision-engine.js — 决策引擎',
    'handleDecision(deviceId, deviceSn, features):',
    null, // keep │
    '├─ 1. 从 InfluxDB 查询 2h 聚合数据',
    '│     对 4 项传感器求 mean / min / max / stddev',
    '│     构建决策上下文特征向量',
    null, // keep │
    '├─ 2. 调用 MiMo AI (mimo-v2.5-pro)',
    '│     OpenAI 兼容接口 | 结构化中文 Prompt',
    '│     输入: 传感器统计 + 历史记录 + 策略规则',
    '│     返回: { confidence, action, duration, reason }',
    null,
    '├─ 3. 决策分发',
    '│     confidence > 0.7 → 自动灌溉',
    '│     confidence < 0.3 → 仅记录日志',
    '│     0.3 ~ 0.7 → WebSocket 推送人工审核',
    null,
    '└─ 4. 冷却机制',
    '     5min 间隔 | 避免 30s 上报都调 LLM',
    '     节省 ~10x API 成本 | 异步非阻塞执行',
    'feature-extractor.js — 特征提取器',
    'extractFeatures(deviceId, hours=2):',
    null,
    '├─ 1. InfluxDB 查询 2h 原始数据',
    '│     range(-2h) → aggregateWindow(1m, mean)',
    null,
    '├─ 2. 统计特征计算',
    '│     mean: 均值    stddev: 标准差',
    '│     slope: 线性回归趋势方向和速率',
    '│     volatility: stddev/mean 波动率',
    '│     min / max: 极值范围',
    null,
    '├─ 3. 归一化到 [0, 1] 区间',
    '│     { moisture_mean: 0.87, slope: -0.03, ... }',
    null,
    '└─ 4. 返回特征向量 → 传入决策引擎',
    null,null,null,null,null,null,null,
    null,null,null,null,null,null,null,null,
  ]);
  s20 = expandShapes(s20, [{i:3,cy:'5842000'},{i:5,cy:'5842000'}]);

  // ===== S21: Anomaly Detection (T14: 2x2 grid, 34 elements) =====
  let s21 = replaceTexts(T[14], [
    'AI 异常检测 — Z-Score + 故障码过滤 + 物理边界校验',
    'anomaly-detector.js | 2h 窗口 | 30min 冷却 | 数据清洗管线 | 多级告警联动',
    'Z-Score 异常检测',
    'checkAnomalies(deviceId, deviceSn, payload):',
    null,
    '├─ 1. 查询 2h 历史 → SELECT mean, stddev',
    '│     FROM sensor_data WHERE device_id=?',
    '├─ 2. 逐字段算 Z-Score = (current-mean)/stddev',
    '│     |z| > 2.5 → warning | |z| > 3.5 → critical',
    '├─ 3. 写入 ai_anomalies (anomaly_type, field_name,',
    '│     current_value, z_score, severity, expected_range)',
    '└─ 4. WebSocket → broadcastAlert() → 前端红色闪烁',
    '故障码过滤 + 数据清洗管线',
    'cleanPayload() 处理流程:',
    '├─ 1. 故障码检测: SENSOR_FAULT_CODES = [999, 998]',
    '│     传感器自检异常 → 拦截不入 InfluxDB → 写 MySQL alerts',
    '├─ 2. 物理边界: soil_moisture[0,100], temp[-20,80]',
    '│     air_humidity[0,100], light[0,200k] 超范围丢弃',
    '├─ 3. parseFloat() 强制浮点 → 统一数值类型',
    '└─ 4. 仅有效字段写入 InfluxDB sensor_data',
    '去重与冷却机制',
    'checkRecentAnomaly(deviceId, type, field, 30min)',
    '同一设备 + 类型 + 字段 → 30min 内不重复',
    'checkRecentAlert(deviceId, type, 30min)',
    '阈值告警同样 30min 冷却 → 防止告警风暴',
    null,
    '传感器故障码规范 (BearPi-HM Nano)',
    '999: 通信超时 (I2C/ADC 无响应) | SHT30/BH1750 异常',
    '998: 自检失败 (CRC 校验错 / 上电未就绪)',
    '上报 → cleanPayload 识别 → 擦除为 null',
    '→ MySQL alerts (sensor_fault, danger) → WebSocket 推送',
    '下次正常数据到达时自动恢复故障状态',
  ]);
  s21 = expandShapes(s21, [{i:3,cy:'2286000'},{i:5,cy:'2286000'},{i:7,cy:'2286000'},{i:9,cy:'2286000'}]);

  // ===== S22: Redis + WebSocket (T14: 2x2 grid, 34 elements) =====
  let s22 = replaceTexts(T[14], [
    'Redis 缓存 + Socket.io WebSocket 实时通信',
    'Redis 7 Alpine | 去重 + 限流 + 缓存 | Socket.io 全双工 WebSocket (替代 Aedes MQTT)',
    'Redis 缓存架构',
    'Redis 7 Alpine Docker | localhost:6379',
    'AOF 持久化 (appendonly yes)',
    null,
    '去重: webhookIdempotent 中间件',
    '  SHA256(request_id) → SET NX EX 300 (5min)',
    '  防止华为云重复推送同一数据包',
    '限流: 单 IP 60req/min',
    '  Redis INCR + TTL 滑动窗口 → 超限 429',
    '  保护后端不被恶意请求打垮',
    'Socket.io WebSocket (架构升级)',
    '替代 Aedes MQTT Broker (原方案)',
    '全双工 WebSocket 统一端口 8080/ws',
    'io.emit() 全局广播 + io.to(device:SN) 房间',
    null,
    '4 类事件推送:',
    '  sensor:data — 传感器 5 项实时数值',
    '  sensor:fault — 硬件故障通知 (999/998)',
    '  alert:new — 阈值告警 / AI 异常告警',
    '  irrigation:status — 灌溉状态变更',
    '前端集成 + Webhook 安全链',
    'mqttStore.js (Pinia) 管理连接, 自动重连 3s',
    'latestData Map 按 device_sn 索引实时刷新',
    'Vite proxy /ws → :8080 支持 WebSocket 升级',
    null,
    'Webhook 中间件链:',
    '  webhookAuth (验签) → webhookIdempotent (去重)',
    '  → cleanPayload (清洗) → writeSensorData (入库)',
    '  → checkAlerts + checkAnomalies + runStrategies',
    '  → broadcastSensorData (Socket.io 推送前端)',
    '架构迁移总结',
    '原方案: Aedes MQTT · 1883/8083 · MQTT.js · Topic',
    '现方案: Socket.io · :8080/ws · io.emit() · 事件名',
    '优势: 端口收敛 | 共享 HTTP Server | 调试友好',
    '前端无需额外端口 | 部署简化 | 性能更优',
  ]);
  s22 = expandShapes(s22, [{i:3,cy:'2286000'},{i:5,cy:'2286000'},{i:7,cy:'2286000'},{i:9,cy:'2286000'}]);

  // ===== S29: Docker + FRP (T12: 4 cards, 46 elements) =====
  let s29 = replaceTexts(T[12], [
    'Docker Compose 容器化部署 + FRP 内网穿透',
    '6 服务编排 | 健康检查 | 数据持久化 | 阿里云 ECS | 一键启动脚本',
    'Docker 编排',
    'smartag-nginx   (80/443)',
    'smartag-backend  (8080)',
    'smartag-mysql    (3306)',
    'smartag-redis    (6379)',
    'smartag-influxdb (8086)',
    'smartag-emqx     (1883/8083)',
    'depends_on 控制启动顺序',
    'restart: unless-stopped',
    '数据持久化',
    'MySQL:', '  ./deploy/mysql/data → /var/lib/mysql',
    'InfluxDB:', '  ./deploy/influxdb/data → /var/lib/influxdb2',
    'Redis:', '  ./deploy/redis/data (AOF)',
    'EMQX:', '  ./deploy/emqx/data → /opt/emqx/data',
    null, null,
    '健康检查', null,
    '健康检查',
    'MySQL: mysqladmin ping -h localhost',
    '  interval 10s | retries 5',
    'Redis: redis-cli ping',
    '  interval 10s | retries 5',
    'InfluxDB: influx ping',
    '  interval 10s | retries 5',
    '全部 healthy 后才启动 backend 依赖',
    null, null, null,
    'FRP 隧道',
    '阿里云 ECS: 47.96.100.108 (frps 服务端)',
    '8081 → localhost:8080 (华为云 Webhook 入口)',
    'WSL Ubuntu: frpc -c frpc.toml (客户端)',
    '一键启动: Start-SmartAg.bat (桌面)',
    'Docker Desktop → 容器 → 后端(8080) → 前端(3000)',
    '→ 自动打开浏览器 http://localhost:3000',
    '安全组: 放行 7000/8080/8081 | Token 认证',
    '开发: node --watch + Vite HMR 热更新',
    'MySQL Windows 原生 | COM5 BearPi 串口直连',
    null, null,
  ]);
  s29 = expandShapes(s29, [{i:3,cy:'2921000'},{i:5,cy:'2921000'},{i:7,cy:'2921000'},{i:9,cy:'2921000'}]);

  // ===== S32: Data Flow (T14: 2x2 grid, 34 elements) =====
  let s32 = replaceTexts(T[14], [
    '端到端全链路数据流 — 从传感器到前端 (升级版)',
    '30s 采集 | QoS 1 MQTT | Webhook | FRP 穿透 | InfluxDB + MySQL | Socket.io | Vue 3',
    '① 嵌入式采集 → ② 华为云 IoTDA',
    'BearPi #1 smart-001 (E53_IA1 传感器板)',
    '  SHT30 温湿度 + BH1750 光照 + Soil ADC',
    null,
    'BearPi #2 smart-002 (继电器 + 水泵)',
    '  GPIO_8 控制 | MQTT 订阅 cmd/# 接收指令',
    'WiFi 2.4GHz · MQTT QoS1 · oc_mqtt v5 Profile',
    '30s 采集周期 · 5 项属性同时上报',
    '16 槽消息队列解耦采集与上报',
    null,
    '③ 华为云转发 → ④ FRP 穿透 → ⑤ 后端',
    '华为云 IoTDA cn-north-4 规则引擎匹配',
    'Webhook POST JSON → notify_data.header + body',
    'FRP 隧道: 47.96.100.108:8081 → frps → frpc',
    '→ localhost:8080/api/v1/huawei/data',
    '后端中间件链: webhookAuth → webhookIdempotent',
    '→ cleanPayload (清洗) → writeSensorData (InfluxDB)',
    '→ checkAlerts + checkAnomalies + runStrategies',
    '⑥ 数据存储 + ⑦ Socket.io 推送 + ⑧ 前端',
    'InfluxDB: sensor_data / irrigation_logs / alerts / ai_anomalies',
    'MySQL: devices / plots / strategies / schedules / alerts',
    'Redis: 去重缓存 + 限流计数 + Session 管理',
    null,
    'Socket.io ws://localhost:8080/ws 统一端口 8080',
    '4 类事件: sensor:data / sensor:fault / alert:new / irrigation:status',
    'mqttStore.latestData → Dashboard ECharts 24h 趋势',
    'MonitorView 实时卡片 5 项传感器数值毫秒级刷新',
    '端到端延迟分析',
    '采集 30s → MQTT <100ms → IoTDA <200ms',
    '→ FRP <300ms → 后端 <50ms → InfluxDB <10ms',
    '→ Socket.io <5ms → 前端 DOM <16ms',
    '端到端总延迟 < 1s (从传感器到屏幕)',
    '全栈技术栈: Hi3861 RISC-V C + Node.js + Vue 3',
    '数据库: MySQL 8.0 + InfluxDB 2.7 + Redis 7',
  ]);
  s32 = expandShapes(s32, [{i:3,cy:'2286000'},{i:5,cy:'2286000'},{i:7,cy:'2286000'},{i:9,cy:'2286000'}]);

  // ===== Insert =====
  let px = await zip.file('ppt/presentation.xml').async('string');
  let pr = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
  let ct = await zip.file('[Content_Types].xml').async('string');
  const sldIds = [...px.matchAll(/<p:sldId id="(\d+)" r:id="(rId\d+)"/g)];
  let maxId=0, maxRid=0;
  for (const m of sldIds) { const v=parseInt(m[1]); if(v>maxId)maxId=v; }
  for (const m of pr.matchAll(/Id="rId(\d+)"/g)) { const v=parseInt(m[1]); if(v>maxRid)maxRid=v; }
  const sm = [];
  for (const m of sldIds) {
    const rm = pr.match(new RegExp('<Relationship Id="'+m[2]+'"[^>]*Target="slides/slide(\\d+)\\.xml"'));
    sm.push({id:parseInt(m[1]), rid:m[2], fn:rm?parseInt(rm[1]):0});
  }

  console.log('Inserting 6 new slides...');
  const NEW = [
    {after:12, xml:s13, label:'InfluxDB'},
    {after:18.1, xml:s20, label:'AI Decision'},
    {after:18.2, xml:s21, label:'Anomaly'},
    {after:18.3, xml:s22, label:'Redis+WS'},
    {after:24, xml:s29, label:'Docker+FRP'},
    {after:26, xml:s32, label:'DataFlow'},
  ].sort((a,b)=>b.after-a.after);

  for (const ns of NEW) {
    maxId++; maxRid++;
    ns.id = maxId; ns.rid = 'rId'+maxRid;
    ns.fn = 500 + NEW.indexOf(ns);
    let pos = sm.findIndex(s => s.fn === Math.floor(ns.after));
    pos = pos===-1 ? sm.findIndex(s=>s.fn===Math.floor(ns.after))+Math.round((ns.after-Math.floor(ns.after))*10) : pos+1;
    sm.splice(pos, 0, {id:ns.id, rid:ns.rid, fn:ns.fn, isNew:true, ns});
    console.log('  Pos '+(pos+1)+': '+ns.label);
  }
  for (let i=0;i<sm.length;i++) sm[i].num=i+1;

  for (const e of sm) {
    if (!e.isNew) continue;
    const ns = e.ns;
    zip.file('ppt/slides/slide'+ns.fn+'.xml', ns.xml);
    zip.file('ppt/slides/_rels/slide'+ns.fn+'.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>\n<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide'+ns.fn+'.xml"/>\n</Relationships>');
    zip.file('ppt/notesSlides/notesSlide'+ns.fn+'.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name=""/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/></p:txBody></p:sp></p:spTree></p:cSld></p:notes>');
    ct = ct.replace('</Types>','<Override PartName="/ppt/slides/slide'+ns.fn+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n<Override PartName="/ppt/notesSlides/notesSlide'+ns.fn+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>\n</Types>');
    pr = pr.replace('</Relationships>','<Relationship Id="'+ns.rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide'+ns.fn+'.xml"/>\n</Relationships>');
  }
  px = px.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, '<p:sldIdLst>'+sm.map(s=>'<p:sldId id="'+s.id+'" r:id="'+s.rid+'"/>').join('')+'</p:sldIdLst>');
  zip.file('ppt/presentation.xml', px);
  zip.file('ppt/_rels/presentation.xml.rels', pr);
  zip.file('[Content_Types].xml', ct);

  const out = await zip.generateAsync({type:'nodebuffer', compression:'DEFLATE', compressionOptions:{level:9}});
  fs.writeFileSync(OUT, out);
  console.log('Done: '+OUT+' ('+sm.length+' slides)');
}
main().catch(e=>{console.error(e);process.exit(1)});
