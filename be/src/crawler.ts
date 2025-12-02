import fs from "fs/promises";
import Bottleneck from "bottleneck";
import { sanitizeWindowsPath } from "./utils/pathUtils.js";

interface Article {
  content: object;
  name: string;
  update_timestamp: number;
}

interface Response<T> {
  data: T;
}

type ArticleResponse = Response<{
  article_info: { content: string; name: string; update_timestamp: number };
}>;

type MenuResponse = Response<{
  articles: { id: string }[];
}>;

export class ArticleCrawler {
  private readonly baseURL: string =
    "https://school.jinritemai.com/api/eschool/v2/library";
  private readonly outputDir: string = "articles";
  private readonly merchantID: string = "11593";
  private readonly limiter: Bottleneck;

  constructor() {
    this.limiter = new Bottleneck({
      maxConcurrent: 30,
      minTime: 50,
    });
  }

  private async fetchData<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json() as Promise<T>;
  }

  private async fetchMenu(node_id: string): Promise<any> {
    const url = `${this.baseURL}/article/list?node_id=${node_id}&page_size=1000`;
    return this.fetchData(url);
  }

  public async fetchMerchantMenu(): Promise<MenuResponse> {
    return this.fetchMenu(this.merchantID) as Promise<MenuResponse>;
  }

  public async fetchArticle(id: string): Promise<ArticleResponse> {
    const url = `${this.baseURL}/article/detail?id=${id}`;
    return this.fetchData(url);
  }

  public parseMenu(json: MenuResponse): string[] {
    const {
      data: { articles },
    } = json;
    return articles.map((item: { id: string }) => item.id);
  }

  public parseArticle(json: ArticleResponse): Article {
    const {
      data: {
        article_info: { content, name, update_timestamp },
      },
    } = json;
    return { content: JSON.parse(content) as object, name, update_timestamp };
  }

  private async saveJSON(data: object, filePath: string): Promise<void> {
    return fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  public async saveArticleJSON(article: Article): Promise<void> {
    const sanitizedName = sanitizeWindowsPath(article.name);
    return this.saveJSON(
      article.content,
      `${this.outputDir}/${sanitizedName}-${article.update_timestamp}.json`,
    );
  }

  public async saveArticle(id: string): Promise<void> {
    const json = await this.fetchArticle(id);
    const article = this.parseArticle(json);
    await fs.mkdir(this.outputDir, { recursive: true });
    await this.saveArticleJSON(article);
  }

  public async fetchAllArticles(): Promise<void[]> {
    const menu = await this.fetchMerchantMenu();
    const idList = this.parseMenu(menu);
    await fs.mkdir(this.outputDir, { recursive: true });
    return Promise.all(
      idList.map(async (id) => {
        const json = await this.limiter.schedule(() => this.fetchArticle(id));
        const article = this.parseArticle(json);
        await this.saveArticleJSON(article);
      }),
    );
  }
}
