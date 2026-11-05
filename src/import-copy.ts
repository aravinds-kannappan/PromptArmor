/** Local UTF-8 text import only. Never execute or render imported markup. */
export async function importCopy(
  file: Pick<File, "name" | "size" | "arrayBuffer">,
): Promise<string> {
  if (!/\.(txt|md)$/i.test(file.name))
    throw new Error(
      "Choose a .txt or .md file. For PDFs or images, paste the extracted campaign copy.",
    );
  if (file.size > 50_000)
    throw new Error("Choose a text file smaller than 50 KB.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true })
      .decode(await file.arrayBuffer())
      .replace(/^\uFEFF/, "")
      .trim();
  } catch {
    throw new Error(
      "This file is not valid UTF-8 text. Save it as UTF-8 or paste the copy.",
    );
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text))
    throw new Error(
      "The file contains binary/control characters. Import plain text instead.",
    );
  if (text.length < 20 || text.length > 5000)
    throw new Error(
      "Campaign copy must contain 20–5,000 characters. Nothing was imported.",
    );
  return text;
}
