Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Pastikan server kantor virtual aktif jika belum jalan
$portActive = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $portActive) {
    Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList "`"C:\Users\maula\.gemini\antigravity\scratch\simple-ai-agent\server.js`""
    Start-Sleep -Milliseconds 800
}

# 2. Rancang Jendela Notifikasi Minimalis Tepat di Tengah Layar Windows
$form = New-Object System.Windows.Forms.Form
$form.Text = "Cantika - Sekretaris Pribadi"
$form.Size = New-Object System.Drawing.Size(480, 270)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true
$form.FormBorderStyle = "None"
$form.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#FBF9F5")

# Panel Luar
$borderPanel = New-Object System.Windows.Forms.Panel
$borderPanel.Dock = "Fill"
$borderPanel.BorderStyle = "FixedSingle"
$form.Controls.Add($borderPanel)

# Header Bar Cantik
$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Size = New-Object System.Drawing.Size(478, 44)
$headerPanel.Location = New-Object System.Drawing.Point(0, 0)
$headerPanel.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#F4EFE6")
$borderPanel.Controls.Add($headerPanel)

# Identitas Pengirim (Cantika)
$lblPengirim = New-Object System.Windows.Forms.Label
$lblPengirim.Text = "👩‍💼 Cantika — Sekretaris Pribadi Ma'am"
$lblPengirim.Location = New-Object System.Drawing.Point(16, 12)
$lblPengirim.Size = New-Object System.Drawing.Size(380, 24)
$lblPengirim.Font = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)
$lblPengirim.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#2C2724")
$headerPanel.Controls.Add($lblPengirim)

# Tombol [✕] Close di pojok kanan atas
$btnClose = New-Object System.Windows.Forms.Button
$btnClose.Text = "✕"
$btnClose.Size = New-Object System.Drawing.Size(40, 34)
$btnClose.Location = New-Object System.Drawing.Point(430, 5)
$btnClose.FlatStyle = "Flat"
$btnClose.FlatAppearance.BorderSize = 0
$btnClose.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$btnClose.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#786F66")
$btnClose.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnClose.Add_Click({ $form.Close() })
$headerPanel.Controls.Add($btnClose)

# Tulisan Utama Sapaan
$lblSapaan = New-Object System.Windows.Forms.Label
$lblSapaan.Text = "`"Ada tugas apa hari ini, Ma'am?`""
$lblSapaan.Location = New-Object System.Drawing.Point(24, 64)
$lblSapaan.Size = New-Object System.Drawing.Size(430, 36)
$lblSapaan.Font = New-Object System.Drawing.Font("Georgia", 16, [System.Drawing.FontStyle]::Bold)
$lblSapaan.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#2C2724")
$borderPanel.Controls.Add($lblSapaan)

# Keterangan Tambahan / Info
$lblInfo = New-Object System.Windows.Forms.Label
$lblInfo.Text = "Cantika, Rexha, dan Hendry siap membantu perkuliahan Anda.`nJadwal kuliah & berkas tugas sudah disinkronkan dengan rapi."
$lblInfo.Location = New-Object System.Drawing.Point(26, 110)
$lblInfo.Size = New-Object System.Drawing.Size(430, 44)
$lblInfo.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$lblInfo.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#627D98")
$borderPanel.Controls.Add($lblInfo)

# Tombol Aksi: Buka Kantor Virtual
$btnOpen = New-Object System.Windows.Forms.Button
$btnOpen.Text = "Buka Kantor Virtual ➔"
$btnOpen.Location = New-Object System.Drawing.Point(26, 180)
$btnOpen.Size = New-Object System.Drawing.Size(190, 40)
$btnOpen.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#2C2724")
$btnOpen.ForeColor = [System.Drawing.Color]::White
$btnOpen.FlatStyle = "Flat"
$btnOpen.FlatAppearance.BorderSize = 0
$btnOpen.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$btnOpen.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnOpen.Add_Click({
    Start-Process "http://localhost:3000"
    $form.Close()
})
$borderPanel.Controls.Add($btnOpen)

# Tombol Tutup [✕]
$btnDismiss = New-Object System.Windows.Forms.Button
$btnDismiss.Text = "Tutup [✕]"
$btnDismiss.Location = New-Object System.Drawing.Point(228, 180)
$btnDismiss.Size = New-Object System.Drawing.Size(120, 40)
$btnDismiss.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#F4EFE6")
$btnDismiss.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#2C2724")
$btnDismiss.FlatStyle = "Flat"
$btnDismiss.FlatAppearance.BorderSize = 0
$btnDismiss.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$btnDismiss.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnDismiss.Add_Click({ $form.Close() })
$borderPanel.Controls.Add($btnDismiss)

# Tampilkan Form Tepat di Tengah Layar
$form.ShowDialog() | Out-Null
