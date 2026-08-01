# 教学管理工作台 - 云端同步 Worker 部署指南

## 问题说明

手机上一键开启自动同步失败（提示 Load failed），是因为免费同步服务 `jsonblob.com` 在中国大陆部分网络环境下无法访问。

**解决方案：部署自己的 Cloudflare Worker 做同步中转**，稳定、免费、全球可用。

---

## 部署步骤（5分钟）

### 1. 注册 Cloudflare 账号

访问 https://dash.cloudflare.com/sign-up ，用邮箱注册，验证邮箱。

### 2. 创建 Worker

1. 登录后进入 Cloudflare Dashboard
2. 左侧菜单点击 **Workers & Pages**
3. 点击 **Create application**
4. 点击 **Create Worker**
5. 给 Worker 起个名字，比如 `teach-sync`
6. 点击 **Deploy**

### 3. 粘贴同步代码

1. Worker 创建成功后，点击 **Edit code**
2. 把 `sync-worker.js` 文件里的全部代码复制进去，覆盖默认代码
3. 点击 **Save and deploy**

### 4. 绑定 KV 存储

1. 在 Worker 页面，点击 **Settings** 标签
2. 左侧点击 **Variables**
3. 找到 **KV Namespace Bindings**，点击 **Add binding**
4. 填写：
   - **Variable name**: `SYNC_KV`
   - **KV namespace**: 点击 **Create a namespace**，输入 `teach-sync-kv`，然后选择它
5. 点击 **Deploy**

### 5. 获取 Worker 地址

1. 回到 Worker 主页（Triggers 标签）
2. 页面上方会显示一个网址，比如：
   ```
   https://teach-sync.你的用户名.workers.dev
   ```
3. 复制这个地址

### 6. 填入教学管理应用

1. 打开手机或电脑上的教学管理应用
2. 进入 **我的** 页面
3. 找到 **"高级：自建 Cloudflare Worker"**
4. 把 Worker 地址粘贴进去
5. 点击 **保存Worker配置**
6. 看到 "同步成功" 就说明成功了

---

## 多设备同步

所有设备都填同一个 Worker 地址，数据就会在所有设备间自动同步。

---

## 注意事项

- Cloudflare Worker 免费版每天有 10 万次请求额度，个人使用完全够用
- KV 存储免费版有 1GB 空间，数据很小，完全够用
- 如果 Worker 地址泄露，别人也能读写你的数据。可以加上访问密码（见下面高级）

---

## 高级：给 Worker 加密码

如果你担心 Worker 地址泄露，可以修改 `sync-worker.js`，在 `/sync` 接口开头加上密码校验：

```javascript
const PASSWORD = '你的密码';
if (request.headers.get('X-Sync-Password') !== PASSWORD) {
  return jsonResponse({ error: 'unauthorized' }, corsHeaders, 401);
}
```

然后在应用里填写 Worker 地址时一起提交密码。需要同时修改前端代码。
