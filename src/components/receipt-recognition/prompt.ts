import type { BillCategory } from "@/ledger/type";

/**
 * Build category list text for AI prompt
 * Format: "Parent Category > Child Category" or "Parent Category"
 */
function buildCategoryListText(
    categories: BillCategory[],
    type: "expense" | "income",
): string {
    const filtered = categories.filter((c) => c.type === type);

    // Build parent-child relationships
    const parents = filtered.filter((c) => !c.parent);
    const children = filtered.filter((c) => c.parent);

    const lines: string[] = [];
    for (const parent of parents) {
        const childCategories = children.filter((c) => c.parent === parent.id);
        if (childCategories.length > 0) {
            for (const child of childCategories) {
                lines.push(`${parent.name} > ${child.name}`);
            }
        } else {
            lines.push(parent.name);
        }
    }

    return lines.join("\n");
}

/**
 * Build AI prompt for parsing receipt OCR text
 * @param ocrText OCR extracted text
 * @param categories All user categories
 * @returns AI prompt string
 */
export function buildReceiptParsePrompt(
    ocrText: string,
    categories: BillCategory[],
): string {
    const expenseCategories = categories.filter((c) => c.type === "expense");
    const incomeCategories = categories.filter((c) => c.type === "income");

    const expenseCategoryList = buildCategoryListText(
        expenseCategories,
        "expense",
    );
    const incomeCategoryList = buildCategoryListText(
        incomeCategories,
        "income",
    );

    return `你是一个专业的记账助手。请从以下OCR识别的小票/账单文本中提取交易记录信息。

OCR文本：
${ocrText}

请提取以下信息（如果文本中没有，则不要猜测）：
1. 交易金额（必须）
2. 商户名称
3. 交易时间（格式：YYYY-MM-DD HH:mm:ss）
4. 收支类型（支出/收入）
5. 交易分类（必须从下面的分类列表中选择最匹配的）
6. 商户解释（20-30字说明消费性质）
7. 备注信息

**可用的支出分类：**
${expenseCategoryList}

**可用的收入分类：**
${incomeCategoryList}

**关于分类的重要说明：**
- 分类是必填项，必须为每条记录选择一个最合适的分类
- 即使无法100%确定，也要根据商户名称、金额、常识进行合理推断
- 优先选择二级分类（格式："一级分类 > 二级分类"）
- 如果没有合适的二级分类，则选择一级分类
- 常见推断规则：
  * 餐饮类商户（餐厅/咖啡店/奶茶店）→ 餐饮 > 正餐/快餐/饮品
  * 交通类（地铁/公交/打车/加油）→ 交通 > 公共交通/打车
  * 超市/便利店 → 购物 > 日用品
  * 电影院/KTV/游戏 → 娱乐 > 影音娱乐
  * 水电煤气费 → 居住 > 水电煤
  * 话费/流量费 → 其他 > 通讯费

**分类示例：**
- "星巴克" → 餐饮 > 饮品
- "滴滴出行" → 交通 > 打车
- "盒马鲜生" → 购物 > 日用品
- "中国移动" → 其他 > 通讯费
- "美团外卖" → 餐饮 > 外卖

注意：
- 一张小票可能包含多条交易记录（如支付宝账单截图）
- 如果是多条记录，请分别列出
- 金额必须是数字，去掉货币符号
- 时间格式必须标准化

请以JSON数组格式返回，每条记录包含：
{
  "amount": 数字,
  "merchant": "商户名",
  "merchantExplanation": "解释这是什么类型的消费，帮助用户理解（20-30字）",
  "time": "YYYY-MM-DD HH:mm:ss",
  "type": "expense" | "income",
  "category": "一级分类 > 二级分类" 或 "一级分类",
  "comment": "备注"
}

**关于merchantExplanation字段：**
- 用20-30字解释这笔消费的性质和用途
- 例如："星巴克咖啡店，购买咖啡饮品"、"滴滴出行打车服务"、"盒马鲜生超市，购买日常生活用品"
- 帮助用户快速理解商户名称的含义和消费场景

如果某个字段无法识别，请设为null（但category必须有值）。`;
}

/**
 * 构建视觉模型直接识图的提示词
 * 与 buildReceiptParsePrompt 的区别：不包含 OCR 文字，直接让模型分析图片
 * @param categories 所有用户分类
 * @returns AI 提示词字符串
 */
export function buildReceiptParseImagePrompt(
    categories: BillCategory[],
): string {
    const expenseCategories = categories.filter((c) => c.type === "expense");
    const incomeCategories = categories.filter((c) => c.type === "income");

    const expenseCategoryList = buildCategoryListText(
        expenseCategories,
        "expense",
    );
    const incomeCategoryList = buildCategoryListText(
        incomeCategories,
        "income",
    );

    return `你是一个专业的记账助手。请直接分析这张小票/账单图片，提取其中的交易记录信息。

请提取以下信息（如果图片中没有，则不要猜测）：
1. 交易金额（必须）
2. 商户名称
3. 交易时间（格式：YYYY-MM-DD HH:mm:ss）
4. 收支类型（支出/收入）
5. 交易分类（必须从下面的分类列表中选择最匹配的）
6. 商户解释（20-30字说明消费性质）
7. 备注信息

**可用的支出分类：**
${expenseCategoryList}

**可用的收入分类：**
${incomeCategoryList}

**关于分类的重要说明：**
- 分类是必填项，必须为每条记录选择一个最合适的分类
- 即使无法100%确定，也要根据商户名称、金额、常识进行合理推断
- 优先选择二级分类（格式："一级分类 > 二级分类"）
- 如果没有合适的二级分类，则选择一级分类
- 常见推断规则：
  * 餐饮类商户（餐厅/咖啡店/奶茶店）→ 餐饮 > 正餐/快餐/饮品
  * 交通类（地铁/公交/打车/加油）→ 交通 > 公共交通/打车
  * 超市/便利店 → 购物 > 日用品
  * 电影院/KTV/游戏 → 娱乐 > 影音娱乐
  * 水电煤气费 → 居住 > 水电煤
  * 话费/流量费 → 其他 > 通讯费

注意：
- 一张图片可能包含多条交易记录（如支付宝账单截图）
- 如果是多条记录，请分别列出
- 金额必须是数字，去掉货币符号
- 时间格式必须标准化
- 请仔细识别图片中的文字和数字，不要遗漏

请以JSON数组格式返回，每条记录包含：
{
  "amount": 数字,
  "merchant": "商户名",
  "merchantExplanation": "解释这是什么类型的消费，帮助用户理解（20-30字）",
  "time": "YYYY-MM-DD HH:mm:ss",
  "type": "expense" | "income",
  "category": "一级分类 > 二级分类" 或 "一级分类",
  "comment": "备注"
}

如果某个字段无法识别，请设为null（但category必须有值）。`;
}
