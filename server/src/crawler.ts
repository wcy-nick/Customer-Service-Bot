import fs from 'fs/promises';

async function fetchData(url: string) {
  const response = await fetch(url);
  return await response.json();
}

function parseArticle(json: any) {
  const { data: { article_info: { content, name, update_timestamp } } } = json;
  return { content: JSON.parse(content), name, update_timestamp };
}

function saveJSON(data: object, filePath: string) {
  return fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function saveArticle(id: string) {
  const url = `https://school.jinritemai.com/api/eschool/v2/library/article/detail?id=${id}`;
  const json = await fetchData(url);

  const article = parseArticle(json);

  await saveJSON(article.content, `${article.name}-${article.update_timestamp}.json`);
}
