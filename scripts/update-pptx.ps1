# SmartAg PPTX Update Script
# Usage: powershell -ExecutionPolicy Bypass -File "D:\aiapp\aiot\scripts\update-pptx.ps1"
param()

$sourceFile = "D:\aiapp\aiot\docs\smart-ag-report_backup.pptx"
$outputFile = "D:\aiapp\aiot\docs\smart-ag-report.pptx"

Write-Host "SmartAg PPTX Update Script" -ForegroundColor Cyan
Write-Host "Source: $sourceFile" -ForegroundColor Gray
Write-Host "Output: $outputFile" -ForegroundColor Gray

Copy-Item $sourceFile $outputFile -Force
Write-Host "Copied backup -> output file" -ForegroundColor Green

$ppt = New-Object -ComObject PowerPoint.Application
try { $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse } catch { }

try {
    $pres = $ppt.Presentations.Open($outputFile)
    Write-Host "Opened:" $pres.Slides.Count "slides" -ForegroundColor Green

    function SafeReplace($shape, $old, $new) {
        try {
            if (-not $shape.HasTextFrame) { return $false }
            if (-not $shape.TextFrame.HasText) { return $false }
            $txt = $shape.TextFrame.TextRange.Text
            if ($txt -and $txt.Contains($old)) {
                $shape.TextFrame.TextRange.Text = $txt.Replace($old, $new)
                return $true
            }
        } catch { }
        return $false
    }

    # ============================================================
    # PART 1: Update existing slides
    # ============================================================
    Write-Host "Updating existing slides..." -ForegroundColor Yellow

    $slidesToFix = @{
        7  = @{ "MQTT" = "Socket.io"; "ws://localhost:8083/mqtt" = "ws://localhost:8080/ws" }
        13 = @{ "Aedes MQTT Broker" = "Socket.io WebSocket" }
        14 = @{ "MQTT Broker" = "Socket.io"; "mqtt-broker.js" = "ws-server.js" }
        25 = @{ "MQTT/WS" = "Socket.io/WS" }
    }

    foreach ($slideNum in $slidesToFix.Keys) {
        $slide = $pres.Slides.Item($slideNum)
        $replacements = $slidesToFix[$slideNum]
        foreach ($shape in $slide.Shapes) {
            foreach ($oldText in $replacements.Keys) {
                $newText = $replacements[$oldText]
                if (SafeReplace $shape $oldText $newText) {
                    Write-Host "  Slide $slideNum : '$oldText' -> '$newText'" -ForegroundColor Gray
                }
            }
        }
    }

    Write-Host "Existing slides updated" -ForegroundColor Green

    # ============================================================
    # PART 2: Add new slides (28-33)
    # ============================================================
    Write-Host "Adding new slides..." -ForegroundColor Yellow

    function New-SmartSlide($title, $subtitle, $bullets, $note) {
        $s = $pres.Slides.Add($pres.Slides.Count + 1, 12)

        $bar = $s.Shapes.AddShape(1, 0, 0, 960, 4)
        $bar.Fill.ForeColor.RGB = 0x22D3EE
        $bar.Line.Visible = $false

        $nb = $s.Shapes.AddTextbox(1, 30, 30, 100, 60)
        $nb.TextFrame.TextRange.Text = $note
        $nb.TextFrame.TextRange.Font.Size = 48
        $nb.TextFrame.TextRange.Font.Bold = $true
        $nb.TextFrame.TextRange.Font.Color.RGB = 0x22D3EE
        $nb.TextFrame.TextRange.Font.Name = "Consolas"

        $tb = $s.Shapes.AddTextbox(1, 60, 100, 800, 50)
        $tb.TextFrame.TextRange.Text = $title
        $tb.TextFrame.TextRange.Font.Size = 24
        $tb.TextFrame.TextRange.Font.Bold = $true
        $tb.TextFrame.TextRange.Font.Color.RGB = 0x22D3EE
        $tb.TextFrame.TextRange.Font.Name = "Microsoft YaHei"

        if ($subtitle) {
            $sb = $s.Shapes.AddTextbox(1, 60, 142, 840, 28)
            $sb.TextFrame.TextRange.Text = $subtitle
            $sb.TextFrame.TextRange.Font.Size = 10
            $sb.TextFrame.TextRange.Font.Color.RGB = 0x8899AA
            $sb.TextFrame.TextRange.Font.Name = "Consolas"
        }

        $cb = $s.Shapes.AddTextbox(1, 60, 185, 840, 350)
        $cb.TextFrame.TextRange.Text = ($bullets -join "`r`n")
        $cb.TextFrame.TextRange.Font.Size = 12
        $cb.TextFrame.TextRange.Font.Color.RGB = 0xCCCCDD
        $cb.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
        $cb.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 6

        $pn = $s.Shapes.AddTextbox(1, 880, 510, 50, 20)
        $pn.TextFrame.TextRange.Text = $pres.Slides.Count.ToString()
        $pn.TextFrame.TextRange.Font.Size = 8
        $pn.TextFrame.TextRange.Font.Color.RGB = 0x556677

        Write-Host "  Slide $note : $title" -ForegroundColor Gray
        return $s
    }

    # --- Slide 28: AI Decision Engine ---
    New-SmartSlide "AI Decision Engine - MiMo AI Smart Irrigation" `
        "2h InfluxDB Aggregation + Linear Regression Features + Structured Chinese Prompt + 5min Cooldown" `
        @(
            "[Data Aggregation] InfluxDB 2h window aggregation: soil_moisture, soil_temp, air_temp, air_humidity. Mean, Min, Max, Stddev computed per window.",
            "[Feature Engineering] feature-extractor.js. Linear regression to compute trend slope (rate of change). Volatility = stddev / mean. Multi-dimension normalization.",
            "[AI Inference] MiMo AI (OpenAI compatible). mimo-v2.5-pro model. Structured Chinese prompt engineering with rules. Returns JSON: { confidence, action, reason }.",
            "[Decision Output] confidence score 0-1. > 0.7: auto-execute irrigation. < 0.3: log only. Mid-range: push to manual review queue via WebSocket.",
            "[Cooldown Mechanism] 5min aiDecisionCooldown. Prevents calling LLM on every sensor report (30s cycle). Reduces API cost by ~10x.",
            "[Key Files] ai-decision-engine.js (main decision logic). feature-extractor.js (statistical features). anomaly-detector.js (anomaly detection)."
        ) "28"

    # --- Slide 29: InfluxDB Time-Series ---
    New-SmartSlide "InfluxDB 2.7 Time-Series Database - Sensor Data Storage" `
        "4 Measurements | Downsampling Aggregation | Auto-Expiry | Unified float Field Type" `
        @(
            "[Storage Architecture] InfluxDB 2.7 Alpine Docker container. http://localhost:8086. Bucket: sensor_data. Org: smart-agriculture. Token-based authentication.",
            "[Measurement 1 - sensor_data] 5 float fields: soil_moisture, soil_temp, air_temp, air_humidity, light. Tags: device_id + device_sn. Written every 30s via writeSensorData().",
            "[Measurement 2 - irrigation_logs] Irrigation start/stop/finish events. trigger_type (manual/auto/scheduled). water_used_l tracking. Linked to strategy_id + operator_id.",
            "[Measurement 3 - alerts] Alert events from alert-engine and anomaly-detector. alert_type + alert_level (info/warning/danger). resolved integer flag. 30min cooldown dedup.",
            "[Measurement 4 - ai_anomalies] AI anomaly detection results. z_score + severity + expected_range + current_value. Linked to anomaly_type + field_name.",
            "[Field Type Fix] writePoint() unified to always use p.floatField() for sensor_data. Resolved integer/float type conflict in InfluxDB (tsm1.IntegerValue vs FloatValue panic).",
            "[Query Patterns] Flux language queries. pivot() for row-column transform. aggregateWindow() for downsampling. paginate() with limit/offset for pagination. 24h trends in < 10ms."
        ) "29"

    # --- Slide 30: Anomaly Detection ---
    New-SmartSlide "AI Anomaly Detection - Z-Score + Fault Code Filter + Boundary Check" `
        "anomaly-detector.js | 2h Sliding Window Statistics | 30min Cooldown | Multi-Level Alert Integration" `
        @(
            "[Z-Score Detection] Each sensor field independently analyzed. Mean and Stddev from 2h InfluxDB window. |z| > 2.5 triggers warning level. |z| > 3.5 triggers critical level.",
            "[Fault Code Filter] SENSOR_FAULT_CODES = [999, 998]. Hardware self-test fault codes detected by BearPi. Intercepted before InfluxDB write. Written to MySQL alerts table as danger level.",
            "[Physical Boundary Check] soil_moisture [0, 100]. soil_temp [-20, 80]. air_temp [-30, 70]. air_humidity [0, 100]. light [0, 200000]. Out-of-range values auto-discarded.",
            "[Alert Integration] Anomaly detected -> createAlert() writes to InfluxDB alerts measurement. WebSocket broadcastAlert() pushes to all connected frontends. Dashboard red flash indicator.",
            "[Dedup Mechanism] Same device_id + same anomaly_type + same field_name -> 30min cooldown via checkRecentAnomaly(). Prevents alert storms from persistent sensor drift.",
            "[Data Cleaning Pipeline] cleanPayload() in huawei-callback.js: 1) Detect fault codes -> set field to null. 2) Check physical boundaries -> set field to null. 3) parseFloat() force float type. 4) Only valid fields written."
        ) "30"

    # --- Slide 31: Redis + WebSocket ---
    New-SmartSlide "Redis Cache + Socket.io WebSocket Real-Time Communication" `
        "Cache-Aside Pattern | Idempotent Dedup | Rate Limiting | Full-Duplex WebSocket Push | /ws Path" `
        @(
            "[Redis Cache] Redis 7 Alpine Docker container. localhost:6379. AOF persistence (appendonly yes). Used for: dedup, rate-limiting, session caching.",
            "[Idempotent Dedup] webhookIdempotent middleware. SHA256 hash of request_id from Huawei Cloud. Redis SET NX EX with 5min TTL. Prevents duplicate Webhook processing.",
            "[Rate Limiting] Per-IP rate limiting: 60 requests/min. Redis INCR with TTL sliding window. Exceeded limit returns HTTP 429. Protects backend from abuse.",
            "[Socket.io Architecture] Replaces Aedes MQTT Broker. Full-duplex WebSocket on ws://localhost:8080/ws. io.emit() for global broadcast. io.to('device:SN') for per-device rooms.",
            "[Event System] 4 event types: sensor:data (real-time 5-field sensor values), sensor:fault (hardware fault notification), alert:new (new alert created), irrigation:status (pump state changes).",
            "[Frontend Integration] mqttStore.js Pinia store. socket.io-client auto-reconnect (3s delay). latestData reactive Map keyed by device_sn. Vite proxy /ws -> localhost:8080 with WebSocket upgrade.",
            "[Architecture Migration] Aedes MQTT (ports 1883/8083) -> Socket.io on unified port 8080. Shared HTTP Server with Express. Fewer open ports. Simpler Docker deployment."
        ) "31"

    # --- Slide 32: Docker Deployment ---
    New-SmartSlide "Docker Compose Containerized Deployment + FRP Intranet Penetration" `
        "One-Click 6-Service Orchestration | Health Checks | Data Persistence | Alibaba Cloud ECS Public Gateway" `
        @(
            "[Docker Compose Services] smartag-nginx (80/443 TLS), smartag-backend (8080), smartag-mysql (3306), smartag-redis (6379), smartag-influxdb (8086), smartag-emqx (1883/8083).",
            "[Data Persistence] MySQL: ./deploy/mysql/data volume mount. InfluxDB: ./deploy/influxdb/data. Redis: ./deploy/redis/data with AOF. EMQX: ./deploy/emqx/data. All survive container restart.",
            "[Health Checks] MySQL: mysqladmin ping every 10s. Redis: redis-cli ping every 10s. InfluxDB: influx ping every 10s. 5 retries with 5s timeout before marking unhealthy.",
            "[FRP Tunnel] Alibaba Cloud ECS (47.96.100.108) runs frps. WSL on dev machine runs frpc. Port mapping: 8081 -> localhost:8080. This is the Huawei Cloud Webhook callback entry point.",
            "[One-Click Start] Start-SmartAg.bat on Desktop. Automatically: 1) Launch Docker Desktop, 2) Start InfluxDB + Redis containers, 3) Start backend (npm run dev), 4) Start frontend (npm run dev), 5) Open browser.",
            "[Dev Mode] Backend: node --watch for auto-restart on file change. Frontend: Vite HMR hot module replacement. MySQL runs natively on Windows. Serial: COM5 connected to BearPi-HM Nano."
        ) "32"

    # --- Slide 33: End-to-End Data Flow ---
    New-SmartSlide "End-to-End Full-Stack Data Flow - From Sensor to Frontend (Upgraded)" `
        "30s Collection | QoS 1 MQTT | Webhook | FRP Tunnel | InfluxDB + MySQL | Socket.io | Vue 3 Real-Time" `
        @(
            "   BearPi #1 smart-001 (E53_IA1 Sensor Board)              BearPi #2 smart-002 (Relay + Water Pump)",
            "       |  30s: SHT30 + BH1750 + Soil Moisture ADC              |  GPIO_8 Relay Control",
            "       v                                                       v",
            "   WiFi 2.4GHz  MQTT QoS1  oc_mqtt v5 Profile           WiFi  MQTT Subscribe to cmd/# Topics",
            "       |                                                       |",
            "       v                                                       v",
            "   Huawei Cloud IoTDA cn-north-4  Device Shadow  Rule Engine  Data Forwarding  Command API",
            "       |                                                       |",
            "       +----------------- Webhook POST (JSON) -----------------+",
            "       |",
            "       v",
            "   FRP Tunnel  47.96.100.108:8081 -> frps -> WSL frpc -> localhost:8080",
            "       |",
            "       v",
            "   Backend POST /api/v1/huawei/data  ->  webhookAuth  ->  webhookIdempotent  ->  cleanPayload()",
            "       |",
            "   +---+---+---+---+---+",
            "   |   |   |   |   |",
            "   v   v   v   v   v",
            " InfluxDB    MySQL     Redis      alert-engine   strategy-engine   anomaly-detector",
            " sensor_data  alerts   dedup      threshold      auto-irrigate     z-score AI",
            "   |            |        |           |               |                 |",
            "   v            v        v           v               v                 v",
            " Socket.io  broadcastSensorData()  sensor:data  irrigation:status  alert:new  sensor:fault",
            "   |",
            "   v",
            " Vue 3 Frontend  mqttStore.latestData  Dashboard ECharts 24h Trends  MonitorView Real-Time Cards"
        ) "33"

    # ============================================================
    # Save
    # ============================================================
    $pres.Save()
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  PPTX Update Complete!" -ForegroundColor Green
    Write-Host "  Original backup preserved: $sourceFile" -ForegroundColor Gray
    Write-Host "  Updated file: $outputFile" -ForegroundColor Green
    Write-Host "  Slides: 27 -> $($pres.Slides.Count)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green

} finally {
    if ($pres) { $pres.Close() }
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
