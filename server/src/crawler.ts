import fs from 'fs/promises';
import Bottleneck from 'bottleneck';
import { sanitizeWindowsPath } from './utils/pathUtils';

const baseURL = 'https://school.jinritemai.com/api/eschool/v2/library';
const output = 'articles';
const merchantID = '11593';

const limiter = new Bottleneck({
  maxConcurrent: 30,
  minTime: 50,
});

async function fetchData(url: string) {
  const response = await fetch(url);
  return response.json();
}

async function fetchMenu(node_id: string) {
  const url = `${baseURL}/article/list?node_id=${node_id}&page_size=1000`;
  return fetchData(url);
}

export async function fetchMerchantMenu() {
  return fetchMenu(merchantID);
}

export async function fetchArticle(id: string) {
  const url = `${baseURL}/article/detail?id=${id}`;
  return fetchData(url);
}

export function parseMenu(json: any) {
  const { data: { articles } } = json;
  return articles.map((item: any) => item.id) as string[];
}

export function parseArticle(json: any) {
  const { data: { article_info: { content, name, update_timestamp } } } = json;
  return { content: JSON.parse(content), name, update_timestamp };
}

function saveJSON(data: object, filePath: string) {
  return fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function saveArticleJSON(article: any) {
  const sanitizedName = sanitizeWindowsPath(article.name);
  return saveJSON(article.content, `${output}/${sanitizedName}-${article.update_timestamp}.json`);
}

export async function saveArticle(id: string) {
  const json = await fetchArticle(id);
  const article = parseArticle(json);
  await fs.mkdir(output, { recursive: true });
  await saveArticleJSON(article);
}

export async function fetchAllArticles() {
  const menu = await fetchMerchantMenu();
  const idList = parseMenu(menu);
  await fs.mkdir(output, { recursive: true });
  return Promise.all(idList.map(async id => {
    const json = await limiter.schedule(() => fetchArticle(id));
    const article = parseArticle(json);
    await saveArticleJSON(article);
  }));
}
