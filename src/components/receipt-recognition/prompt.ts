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
    return `**【分类推断强制规则 - 必须严格执行】**

**原则一：category 字段必须有值，绝对禁止返回 null 或空字符串。**
即使完全无法判断，也必须从可用分类中选择一个最接近的，或选择"其他"类作为兜底。

**原则二：根据商户/公司名称进行行业推断。**
公司名称往往包含行业信息，即使名称看起来陌生，也要结合常识进行推断：
- 名称含「餐饮/饭/厨/食/茶/咖啡/奶茶/烧烤/火锅/外卖」→ 餐饮类
- 名称含「科技/网络/软件/信息/数据/智能/云计算」→ 可能是软件订阅、数码产品或办公费用
- 名称含「游戏/娱乐/传媒/动漫/影视/文化/互动」→ 娱乐类
- 名称含「医疗/医院/诊所/药/健康/卫生/养生」→ 医疗健康类
- 名称含「教育/学院/培训/学校/辅导/课程」→ 教育类
- 名称含「物流/快递/运输/货运/配送」→ 交通或购物类
- 名称含「超市/商场/百货/零售/便利」→ 购物类
- 名称含「地产/房产/物业/装修/家居」→ 居住类
- 名称含「银行/保险/金融/证券/基金/理财」→ 金融类
- 名称含「通信/电信/移动/联通/流量/宽带」→ 通讯费

**原则三：结合金额辅助判断。**
- 金额 > 5000 → 可能是房贷/大件数码/旅行/培训
- 金额 500~5000 → 可能是数码产品/家居/旅行/餐饮大额
- 金额 50~500 → 餐饮/购物/娱乐/交通
- 金额 < 50 → 餐饮零食/交通/日用品

**原则四：分类优先级。**
1. 优先选择二级分类（格式："一级分类 > 二级分类"）
2. 无合适二级分类则选一级分类
3. 完全无法判断时选"其他"，严禁返回 null

**常见推断示例（供参考）：**
- "星巴克"、"瑞幸咖啡" → 餐饮
- "滴滴"、"高德打车"、"美团打车" → 交通
- "盒马"、"山姆"、"沃尔玛" → 购物
- "美团"、"饿了么" → 餐饮
- "京东"、"淘宝"、"拼多多" → 购物
- "Steam"、"Epic"、"网易游戏"、"腾讯游戏"、"米哈游" → 娱乐
- "爱奇艺"、"优酷"、"腾讯视频"、"Netflix"、"Spotify" → 娱乐
- "中国移动"、"中国联通"、"中国电信" → 其他（通讯费）
- "国家电网"、"自来水公司" → 居住（水电费）
- "XX科技有限公司" → 结合金额和上下文推断（小额可能是软件订阅/游戏，大额可能是数码设备）
- "XX文化传媒有限公司" → 娱乐或其他
- "XX网络科技有限公司" → 若小额可能是游戏/软件订阅，大额可能是数码或办公`;
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
7. 备注信息

**可用的支出分类：**
${expenseCategoryList}

**可用的收入分类：**
${incomeCategoryList}

${buildCategoryInferenceRules()}

注意：
- 一张小票可能包含多条交易记录（如支付宝/微信账单截图），请全部提取
- 金额必须是数字，去掉货币符号（¥/$等）
- 时间格式必须标准化为 YYYY-MM-DD HH:mm:ss

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

**重要：category 字段必须有值，time/merchant/comment 等可以为null，但 category 严禁为null。**`;
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
7. 备注信息

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
- 对于不认识的公司名，务必结合行业关键词和金额进行推断，给出最合理的分类

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

**重要：category 字段必须有值，time/merchant/comment 等可以为null，但 category 严禁为null。**`;
}
