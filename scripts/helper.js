// 去重辅助函数：检查是否已有相同text和link的项
export function isDuplicate(items, text, link) {
    return items.some(item => item.text === text && item.link === link);
}
// 主函数：整理数据为目标结构
export function organizeData(data) {
    const topCategories = {}; // 存储顶级分类

    data.forEach(item => {
        const { category, title, slug } = item;
        if (!category || category.length === 0) return;

        // 处理顶级分类
        const topCat = category[0];
        if (!topCategories[topCat]) {
            topCategories[topCat] = { text: topCat,collapsed: false, items: [] };
        }
        let currentItems = topCategories[topCat].items;

        // 处理层级分类（从第二个分类开始）
        for (let i = 1; i < category.length; i++) {
            const cat = category[i];
            // 查找当前层级是否已有该分类（分类项无link属性）
            let existingCat = currentItems.find(item => item.text === cat && !item.link);
            if (!existingCat) {
                existingCat = { text: cat, items: [] };
                currentItems.push(existingCat);
            }
            currentItems = existingCat.items; // 进入下一级
        }

        // 添加叶子节点（带link的项），并去重
        if (!isDuplicate(currentItems, title, slug)) {
            currentItems.push({ text: title, link: slug });
        }
    });

    // 转换为目标输出结构
    const result = {};
    Object.keys(topCategories).forEach(topCat => {
        const key = `/${topCat}/`;
        result[key] = [topCategories[topCat]];
    });

    return result;
}

export function organizeNav(data) {
    // 用于存储一级分类下的二级分类（去重）
    const categoryMap = {};

    data.forEach(item => {
        const { category } = item;
        if (!category || category.length < 2) return; // 至少需要两级分类

        const level1 = category[0]; // 一级分类
        const level2 = category[1]; // 二级分类（最多保留到这一级）

        // 初始化一级分类
        if (!categoryMap[level1]) {
            categoryMap[level1] = new Set();
        }

        // 存储二级分类（去重）
        categoryMap[level1].add(level2);
    });

    // 转换为目标结构
    return Object.entries(categoryMap).map(([level1Text, level2Set]) => {
        return {
            text: level1Text,
            items: Array.from(level2Set).map(level2Text => {
                // 生成link和activeMatch：/一级/二级/
                const path = `/${level1Text}/${level2Text}/`;
                return {
                    text: level2Text,
                    link: `/${level1Text}/`,
                    activeMatch: `/${level1Text}/`
                };
            })
        };
    });
}
