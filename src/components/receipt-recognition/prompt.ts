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
 * 通用的分类推断规则说明（两个 Prompt 共享）
 */
function buildCategoryInferenceRules(): string {
    return `**【分类规则】**
1. **只能从上方分类列表中选择**，不得返回列表外的分类，不得自行创造或修改分类名
2. 优先选择二级分类（格式："一级分类 > 二级分类"），无合适二级分类时选一级分类
3. category 字段不能为 null 或空字符串；实在无法判断时选列表中含"其他"字样的分类兜底`;
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

请提取以下信息：
1. 交易金额（必须）
2. 商户名称
3. 交易时间（格式：YYYY-MM-DD HH:mm:ss）
4. 收支类型（支出/收入）
5. 交易分类（必须从下面的分类列表中选择，**绝对不能为空**）
6. 商户解释（20-30字说明消费性质）

**可用的支出分类：**
${expenseCategoryList}

**可用的收入分类：**
${incomeCategoryList}

${buildCategoryInferenceRules()}

注意：
- 一张小票可能包含多条交易记录（如支付宝/微信账单截图），请全部提取
- 金额必须是数字，去掉货币符号（¥/$等）
- 时间格式必须标准化为 YYYY-MM-DD HH:mm:ss
- 商户名只提取核心主体名称，去掉括号内的账号/卡号后四位/流水号等附加信息（如"袁建军(4273)" → "袁建军"）

请以JSON数组格式返回，每条记录包含：
{
  "amount": 数字,
  "merchant": "商户名",
  "merchantExplanation": "解释这是什么类型的消费，帮助用户理解（20-30字）",
  "time": "YYYY-MM-DD HH:mm:ss",
  "type": "expense" | "income",
  "category": "一级分类 > 二级分类" 或 "一级分类"
}

**重要：category 字段必须有值，time/merchant 等可以为null，但 category 严禁为null。**`;
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

    return `你是一个专业的记账助手。请直接分析这张小票/账单图片，提取其中的所有交易记录信息。

请提取以下信息：
1. 交易金额（必须）
2. 商户名称（仔细识别图片中的文字）
3. 交易时间（格式：YYYY-MM-DD HH:mm:ss）
4. 收支类型（支出/收入）
5. 交易分类（必须从下面的分类列表中选择，**绝对不能为空**）
6. 商户解释（20-30字说明消费性质）

**可用的支出分类：**
${expenseCategoryList}

**可用的收入分类：**
${incomeCategoryList}

${buildCategoryInferenceRules()}

注意：
- 一张图片可能包含多条交易记录（如支付宝/微信账单截图），请全部提取，不要遗漏
- 请仔细识别图片中每一行的金额、商户名称、时间信息
- 金额必须是数字，去掉货币符号（¥/$等）
- 时间格式必须标准化为 YYYY-MM-DD HH:mm:ss
- 商户名只提取核心主体名称，去掉括号内的账号/卡号后四位/流水号等附加信息（如"袁建军(4273)" → "袁建军"）

请以JSON数组格式返回，每条记录包含：
{
  "amount": 数字,
  "merchant": "商户名",
  "merchantExplanation": "解释这是什么类型的消费，帮助用户理解（20-30字）",
  "time": "YYYY-MM-DD HH:mm:ss",
  "type": "expense" | "income",
  "category": "一级分类 > 二级分类" 或 "一级分类"
}

**重要：category 字段必须有值，time/merchant 等可以为null，但 category 严禁为null。**`;
}
