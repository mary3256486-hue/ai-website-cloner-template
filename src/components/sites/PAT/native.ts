import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativePrintPlugin {
  printCurrent(options: { title: string }): Promise<void>;
  printHtml(options: { html: string; title: string }): Promise<void>;
}

export const NativePrint = registerPlugin<NativePrintPlugin>("NativePrint");

export function isNativeAndroid() {
  return Capacitor.getPlatform() === "android";
}

/** Android: PrintManager trên WebView thật (giữ CSS @media print); còn lại: window.print. */
export function printCurrentPage(title = "Gia phả") {
  if (isNativeAndroid()) {
    void NativePrint.printCurrent({ title });
    return;
  }
  window.print();
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được nội dung tệp"));
    reader.readAsDataURL(blob);
  });
}

function webDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Android: ghi tạm rồi mở hộp thoại chia sẻ/lưu của hệ điều hành; còn lại: tải bằng thẻ a. */
export async function saveBlob(blob: Blob, filename: string) {
  if (!isNativeAndroid()) {
    webDownload(blob, filename);
    return;
  }
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });
  await Share.share({ title: filename, url: uri, dialogTitle: "Lưu hoặc chia sẻ tệp gia phả" }).catch(
    () => {},
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  void saveBlob(blob, filename).catch((error) => console.error(error));
}