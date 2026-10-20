function database() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("axis-images", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("images");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}
async function browserPack(value) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
          "images",
          value === undefined ? "readonly" : "readwrite",
        ),
        store = tx.objectStore("images"),
        req =
          value === undefined ? store.get("pack") : store.put(value, "pack");
      tx.oncomplete = () =>
        resolve(value === undefined ? (req.result ?? {}) : value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function loadImagePack() {
  let shared = {},
    local = {};
  try {
    const r = await fetch("/api/custom-images");
    if (r.ok) shared = await r.json();
  } catch {}
  try {
    local = await browserPack();
  } catch {}
  const result = { ...shared };
  for (const [id, fields] of Object.entries(local))
    result[id] = { ...result[id], ...fields };
  return result;
}
export async function saveImagePack(pack) {
  if (document.querySelector('meta[name="axis-desktop"]')) {
    try {
      const r = await fetch("/api/custom-images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pack),
      });
      if (r.ok) {
        await browserPack({}).catch(() => {});
        return "PC 파일에 저장했습니다. 같은 폴더의 새 EXE에도 유지됩니다.";
      }
    } catch {}
  }
  await browserPack(pack);
  return "이 브라우저에 저장했습니다. 다른 기기나 주소에는 자동 적용되지 않습니다.";
}
export async function imageData(file, kind) {
  if (
    !file ||
    file.size > 8 * 1024 * 1024 ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw Error("8MB 이하의 PNG, JPG, WebP 파일을 선택하세요.");
  const url = URL.createObjectURL(file),
    img = new Image();
  try {
    img.src = url;
    await img.decode();
    if (img.width > 4096 || img.height > 4096)
      throw Error("이미지는 가로·세로 4096 이하로 준비하세요.");
    if (
      kind === "skin" &&
      (img.width < 128 ||
        img.width > 1024 ||
        img.width % 128 ||
        img.width !== img.height * 2)
    )
      throw Error(
        "스킨은 128×64, 256×128 등 4×2 격자 비율의 PNG를 사용하세요.",
      );
    const c = document.createElement("canvas");
    c.width = kind === "skin" ? img.width : 160;
    c.height = kind === "skin" ? img.height : 128;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/png");
    if (data.length > 2 * 1024 * 1024)
      throw Error("변환 이미지가 너무 큽니다. 크기를 줄여주세요.");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
