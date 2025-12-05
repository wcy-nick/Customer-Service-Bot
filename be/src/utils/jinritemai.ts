export interface Schema {
  deltas: Record<
    string,
    {
      ops: {
        insert: string;
        attributes?: {
          heading?: "h1" | "h2";
          blockquote?: "true";
          list?: "bullet";
          hyperlink?: string;
          "clientside-auto-url"?: string;
          bold?: "true";
          IMAGE?: string;
        };
      }[];
    }
  >;
}

export function parse(json: Schema): string {
  const finalText: string[] = [];

  const zones = json.deltas;
  const zoneIds = Object.keys(zones);

  for (const zoneId of zoneIds) {
    const zone = zones[zoneId];
    const ops = zone.ops;

    for (const op of ops) {
      if (!op.insert) continue;

      const text = typeof op.insert === "string" ? op.insert : "";
      const attrs = op.attributes || {};

      // 1. 标题解析
      if (attrs.heading === "h1") {
        const header = text === "*" ? "" : text;
        finalText.push(`\n# ${header}`);
        continue;
      }
      if (attrs.heading === "h2") {
        const header = text === "*" ? "" : text;
        finalText.push(`\n## ${header}`);
        continue;
      }

      // 2. 引用
      if (attrs.blockquote) {
        const header = text === "*" ? "" : text;
        finalText.push(`> ${header}`);
        continue;
      }

      // 3. 列表
      if (attrs.list && attrs.list.startsWith("bullet")) {
        const header = text === "*" ? "" : text;
        finalText.push(`- ${header}`);
        continue;
      }

      if (attrs.hyperlink) {
        const obj = JSON.parse(attrs.hyperlink) as {
          href: string;
          linkId: string;
        };
        finalText.push(`[${text}](${obj.href})`);
        continue;
      }

      if (attrs["clientside-auto-url"]) {
        finalText.push(`[${text}](${attrs["clientside-auto-url"]})`);
        continue;
      }

      // 4. 粗体
      if (attrs.bold) {
        finalText.push(`**${text}**`);
        continue;
      }

      // 5. 图片（丢弃）
      if (attrs.IMAGE) {
        // finalText.push(`[图片略]`);
        continue;
      }

      // 6. 默认文本
      finalText.push(text);
    }

    finalText.push("\n");
  }

  return finalText.join("");
}
