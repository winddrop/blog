---
title: 'websoket '
description: >-
  # websoket  心跳机制建立 和  轮训垫片  ```powershell import Ajax from "@/common/http";
  import api, { ENV } from
date: '2025-08-12T02:01:00.000Z'
updated: '2025-08-12T05:56:00.000Z'
category:
  - likou
  - licko1
tags:
  - 前端
notion_id: 24d314c0-6846-805d-8ad7-e2e78bd3d87a
notion_url: 'https://www.notion.so/websoket-24d314c06846805d8ad7e2e78bd3d87a'
---
# websoket 
心跳机制建立 和  轮训垫片

```powershell
import Ajax from "@/common/http";
import api, { ENV } from '@/common/api/apimix';

class MessMonitor {
    constructor(connectUrl, userInfo) {
        this.connectUrl = connectUrl; // ws链接地址
        this.userInfo = userInfo; // 用户数据
        this.ws = this.initWebsocket(); // ws对象
        this.textMsgPool = []; // 文本消息池
        this.audioMsgPool = []; // 语音消息池
        this.subscribers = []; // 订阅消息池的回调函数
        this.checkTimer = 5000; // 轮询输出消息池的间隔毫秒数
        this.delayRetry = 0; // 链接断开后步进重连的延迟时间
        this.wsKey = null; // 链接的wsKey,在open的时候new一个时间戳生成
        this.delayUnit = 30 * 1000; // 每次重连失败后的步进值单位
        this.lastMsg = null; // WS降级后,轮询每次将getMsg中createTime最大的缓存,用于下次对比
        this.underDegrade = false; // 是否开始降级
        // 每5S去取一次消息池中的消息,并且调用订阅者回调
        setInterval(() => {
            this.outPutMsg();
        }, this.checkTimer);
    }

    // 初始化所有内部数据
    initParam() {
        this.textMsgPool = []; // 文本消息池
        this.audioMsgPool = []; // 语音消息池
        this.ws = this.initWebsocket();
        this.wsKey = null;
    }

    // 建立websocket链接
    initWebsocket() {
        if (window.WebSocket) {
            const ws = new WebSocket(this.connectUrl);

            ws.onopen = (res) => {
                // 通知后端已经建立成功
                this.confirmReceived({ ws, isInit: true });

                // 如果在降级中停止降级
                if (this.underDegrade) {
                    this.stopDegrade();
                }

                // 开启心跳链接
                this.startHeartbeat();

                // 停止尝试重连,并重置步进值
                if (this.delayRetryTimer) {
                    clearTimeout(this.delayRetryTimer);
                    this.delayRetry = 0;
                }
            };

            this.bindWebsocket(ws);

            return ws;
        }
        console.error("当前浏览器不支持websocket");
        return {};
    }

    // 收到消息后后发送ack包通知后端收到成功
    confirmReceived({
        ws, pushType, msgDataId, isInit,
    }) {
        console.log(this.wsKey, "..........");

        if (ws.readyState === 1) {
            ws.send(
                JSON.stringify({
                    wsType: isInit ? 2 : 3,
                    userId: this.userInfo.userId,
                    tenantId: this.userInfo.tenantId,
                    wsKey: this.wsKey ? this.wsKey : (this.wsKey = Date.now()),
                    pushType,
                    msgDataId,
                }),
            );
        }
    }

    // 绑定websocket各生命周期事件
    bindWebsocket(ws) {
    // wsType : 1-心跳请求；2-新用户上线；3-ack请求；4-后台推送；
        if (window.WebSocket) {
            // 后端推送消息触发
            ws.onmessage = (res) => {
                if (res && res.data) {
                    const {
                        pushType, title, actionUrl, voiceUrl, wsType, msgDataId, importantStatus, groupId,
                    } = JSON.parse(res.data);

                    if (wsType === 4) {
                        this.confirmReceived({
                            ws, msgDataId, pushType, isInit: false,
                        });
                        if (this.heartTimer) {
                            clearInterval(this.heartTimer);
                            this.startHeartbeat();
                        }
                    }
                    const textMsgItem = {
                        title, actionUrl, importantStatus, groupId,
                    };

                    switch (pushType) {
                        // 1-文本推送；2-语音推送；3-文本和语音推送
                        case 1:
                            this.addMsg("text", textMsgItem);
                            break;
                        case 2:
                            this.addMsg("audio", voiceUrl);
                            break;
                        case 3:
                            this.addMsg("text", textMsgItem);
                            this.addMsg("audio", voiceUrl);
                            break;
                        default:
                            break;
                    }
                }
            };

            // 链接关闭的时候触发
            ws.onclose = (e) => {
                if (this.heartTimer) {
                    clearInterval(this.heartTimer);
                }
                this.reConnect();
            };

            // 链接建立错误的时候触发
            ws.onerror = (err) => {};
        } else {
            console.error("该浏览器暂不支持websocket!");
        }
    }

    // 心跳包开始
    startHeartbeat() {
        this.heartTimer = setInterval(() => {
            this.heartRequest();
        }, 1 * 60 * 1000);
    }

    // 心跳请求
    heartRequest() {
        if (this.ws.readyState === 1) {
            this.ws.send(
                JSON.stringify({
                    wsType: 1,
                    wsKey: this.wsKey,
                    userId: this.userInfo.userId,
                    tenantId: this.userInfo.tenantId,
                }),
            );
        }
    }

    // 断开重连
    reConnect() {
        this.delayRetryTimer = setTimeout(() => {
            this.initParam();
            this.delayRetry += this.delayUnit;
        }, this.delayRetry);

        // 当重连失败3次后,进入到降级方案,采用轮询
        if (this.delayRetry === this.delayUnit * 2) {
            this.startDegrade();
        }
    }

    /**
   *
   * 开始降级方案,轮询逻辑
   * @memberof MessMonitor
   */
    startDegrade() {
        console.warn("开始降级!");
        this.underDegrade = true;
        this.getMsg();
    }

    getMsg() {
        Ajax.post("getMsg", { requestType: 2 })
            .then((res) => {
                if (res && res.code === "0000") {
                    const { ordinaryDatas, voiceUrls } = res.data;
                    const combineData = [...ordinaryDatas];
                    // 如果this.lastMsg不为空的话,说明已经进入了轮询降级,需要判断新的getMsg中的消息是否有晚于上次缓存的
                    if (this.lastMsg) {
                        // 将本次取到的数据和缓存的最新的消息对比,筛选出创建时间大于缓存消息的数据
                        const newMsgArr = combineData.filter(
                            (item) => item.createTime > this.lastMsg.createTime,
                        );
                        if (newMsgArr.length > 0) {
                            newMsgArr.forEach((item) => {
                                const { title, actionUrl } = item;
                                this.addMsg("text", { title, actionUrl });
                            });
                            if (voiceUrls && voiceUrls.length > 0) {
                                voiceUrls.forEach((item) => {
                                    this.addMsg("voice", item);
                                });
                            }
                        }
                    }

                    let lastMsg = this.lastMsg || { createTime: 0 };

                    combineData.forEach((item) => {
                        if (item.createTime > lastMsg.createTime) {
                            lastMsg = item;
                        }
                    });

                    this.lastMsg = lastMsg;
                }
            })
            .finally((res) => {
                if (this.underDegrade) {
                    this.getMsgTimer = setTimeout(() => {
                        this.getMsg();
                    }, 30 * 1000);
                }
            });
    }

    /**
   *
   * 结束降级方案
   * @memberof MessMonitor
   */
    stopDegrade() {
        console.warn("停止降级!");
        this.underDegrade = false;
        clearTimeout(this.getMsgTimer);
    }

    /**
   *
   *往消息池中增加消息
   * @param {string:'text'||'audio'}
   * @param {object:{}} msg
   * @memberof MessMonitor
   */
    addMsg(type, msg) {
        if (type === "text") {
            this.textMsgPool.push(msg);
        } else {
            this.audioMsgPool.push(msg);
        }
    }

    /**
   *
   * 输出消息池中的消息
   * @param {string:'text'||'audio'}
   * @memberof MessMonitor
   */
    outPutMsg() {
        if (this.textMsgPool.length + this.audioMsgPool.length === 0) {
            return;
        }

        const msgPool = {
            textMsgPool: this.textMsgPool,
            audioMsgPool: this.audioMsgPool,
        };

        this.subscribers.forEach((cb) => {
            cb(msgPool);
        });

        this.textMsgPool = [];
        this.audioMsgPool = [];
    }

    /**
   *
   * 暴露给外界订阅消息池数据,如果消息池有数据每3秒会统一执行一次订阅函数
   * @param {function} cb
   * @return {null}
   * @memberof MessMonitor
   */
    subscribeMsg(cb) {
        if (!(cb instanceof Function)) {
            console.log("订阅者非函数!");
            return;
        }
        this.subscribers.push(cb);
    }

    /**
     *
     * 消息池的消息变化了触发，通知所有订阅者更新视图，
     * @memberof MessMonitor
     */
    msgChanged() {
        this.subscribers.forEach((cb) => {
            cb();
        });
    }
}

// 获取用户信息
function getInstance() {
    Ajax.get("getUserInfo").then((res) => {
        if (res && res.code === "0000" && res.data) {
            const userInfo = {
                ...res.data,
                cryptoPhone: res.data.mobile.replace(
                    /(\d{3})(\d+)(\d{4})/,
                    (a, b, c, d) => b + c.replace(/\d/g, "*") + d,
                ),
            };

            window.xPartner_msIns = new MessMonitor(`wss://${ENV}xiaoxi.fit.dmall.com:8106/wsServer?token=${userInfo.token}`, userInfo);
        }
    });
}

getInstance();

```

