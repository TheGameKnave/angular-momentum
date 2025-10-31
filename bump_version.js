const fs = require("fs");
const path = require("path");

function bumpPatch(version) {
  const parts = version.split(".");
  const [major, minor, patch] = parts.map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function isSemverGreater(v1, v2) {
  const [m1, n1, p1] = v1.split(".").map(Number);
  const [m2, n2, p2] = v2.split(".").map(Number);
  if (m1 !== m2) return m1 > m2;
  if (n1 !== n2) return n1 > n2;
  return p1 > p2;
}

const rootPkgPath = path.resolve("package.json");
if (!fs.existsSync(rootPkgPath)) {
  console.error("❌ Cannot find root package.json");
  process.exit(1);
}
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
const oldVersion = rootPkg.version;
const newVersion = process.argv[2] || bumpPatch(oldVersion);
console.log(`🔁 Bumping version: ${oldVersion} → ${newVersion}`);

// -----------------------------
// Update iOS bundleVersion in tauri.conf.json
// -----------------------------
const tauriConfPath = path.resolve("client/src-tauri/tauri.conf.json");
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));

if (!tauriConf.bundle.iOS) tauriConf.bundle.iOS = {};

// Only increment bundleVersion if semver increased
if (isSemverGreater(newVersion, oldVersion)) {
  tauriConf.bundle.iOS.bundleVersion = (Number(tauriConf.bundle.iOS.bundleVersion || 0) + 1).toString();
  console.log(`🔢 iOS bundleVersion incremented to ${tauriConf.bundle.iOS.bundleVersion}`);
  tauriConf.bundle.android.versionCode = Number(tauriConf.bundle.android.versionCode || 0) + 1;
  console.log(`🔢 android bundleVersion incremented to ${tauriConf.bundle.android.versionCode}`);
}

fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));

// -----------------------------
// Other file updates
// -----------------------------
const targets = [
  {
    file: "package.json",
    pattern: /("name":\s*"angular-momentum",\s*\n\s*"version":\s*")(\d+\.\d+\.\d+)(")/,
    replacement: `$1${newVersion}$3`,
  },
  {
    file: "package-lock.json",
    pattern: /("name":\s*"angular-momentum",\s*\n\s*"version":\s*")(\d+\.\d+\.\d+)(")/,
    replacement: `$1${newVersion}$3`,
  },
  {
    file: "client/package.json",
    pattern: /("name":\s*"angular-momentum",\s*\n\s*"version":\s*")(\d+\.\d+\.\d+)(")/,
    replacement: `$1${newVersion}$3`,
  },
  {
    file: "client/src-tauri/Cargo.toml",
    pattern: /(name\s*=\s*"angular-momentum"\s*\n\s*version\s*=\s*")(\d+\.\d+\.\d+)(")/,
    replacement: `$1${newVersion}$3`,
  },
  {
    file: "client/src-tauri/Cargo.lock",
    pattern: /(name\s*=\s*"angular-momentum"\s*\n\s*version\s*=\s*")(\d+\.\d+\.\d+)(")/,
    replacement: `$1${newVersion}$3`,
  },
  {
    file: "client/src-tauri/tauri.conf.json",
    pattern: /("productName":\s*"Angular Momentum",\s*\n\s*"version":\s*")(\d+\.\d+\.\d+)(")/,
    replacement: `$1${newVersion}$3`,
  },
  {
    file: "client/src-tauri/latest.json",
    pattern: new RegExp(oldVersion.replace(/\./g, "\\."), "g"),
    replacement: newVersion,
  },
  {
    file: "client/src-tauri/gen/apple/angular-momentum_iOS/Info.plist",
    pattern: new RegExp(`<string>${oldVersion}</string>`, "g"),
    replacement: `<string>${newVersion}</string>`,
  },
  {
    file: "client/src-tauri/gen/apple/project.yml",
    pattern: new RegExp(`(CFBundle(Short)?VersionString: )${oldVersion}`, "g"),
    replacement: `$1${newVersion}`,
  },
];

for (const { file, pattern, replacement } of targets) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const updated = content.replace(pattern, replacement);

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, "utf8");
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`ℹ️  No changes needed: ${file}`);
  }
}

// -----------------------------
// Determine version change type
// -----------------------------
function getBumpType(oldV, newV) {
  const [oldMajor, oldMinor, oldPatch] = oldV.split(".").map(Number);
  const [newMajor, newMinor, newPatch] = newV.split(".").map(Number);

  if (newMajor > oldMajor) return "major release";
  if (newMinor > oldMinor) return "minor version";
  if (newPatch > oldPatch) return "patch";
  return "version change";
}

const bumpType = getBumpType(oldVersion, newVersion);

// -----------------------------
// Update changelog
// -----------------------------
if (isSemverGreater(newVersion, oldVersion)) {
  const changeLogPath = path.resolve("server/data/changeLog.ts");
  if (!fs.existsSync(changeLogPath)) {
    console.warn(`⚠️  File not found: ${changeLogPath}`);
  } else {
    const changeLogContent = fs.readFileSync(changeLogPath, "utf8");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const newEntry = `\n  {
    version: "${newVersion}",
    date: "${dateStr}",
    description: "New ${bumpType}",
    changes: [
      "",
    ]
  },\n  `;

    const updatedContent = changeLogContent.replace(
      /export const changeLog = \[\s*/,
      (match) => `${match}${newEntry}`
    );

    fs.writeFileSync(changeLogPath, updatedContent, "utf8");
    console.log(`📝 Added new changelog entry for version ${newVersion} (${bumpType})`);
  }
} else {
  console.log(`ℹ️  Version did not increase; no new changelog entry added.`);
}
