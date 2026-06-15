-- CreateTable
CREATE TABLE "ShellyData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voltage_a" REAL NOT NULL,
    "current_a" REAL NOT NULL,
    "power_a" REAL NOT NULL,
    "voltage_b" REAL NOT NULL,
    "current_b" REAL NOT NULL,
    "power_b" REAL NOT NULL,
    "voltage_c" REAL NOT NULL,
    "current_c" REAL NOT NULL,
    "power_c" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "shellyIp" TEXT NOT NULL DEFAULT '192.168.1.68'
);
