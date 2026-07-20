/**
 * src/index.js — Cloudflare Worker 入口
 * 路由分发：/api/* 交给对应处理函数，其他请求交给静态资源
 */

import { onRequestPost as huangliPost, onRequestOptions as huangliOptions } from '../functions/api/huangli.js';
import { onRequestGet as weatherGet, onRequestOptions as weatherOptions } from '../functions/api/weather.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const context = { request, env, ...ctx };

    // === API 路由 ===
    if (url.pathname === '/api/huangli') {
      if (request.method === 'OPTIONS') return huangliOptions(context);
      if (request.method === 'POST') return huangliPost(context);
      return new Response('Method not allowed', { status: 405 });
    }

    if (url.pathname === '/api/weather') {
      if (request.method === 'OPTIONS') return weatherOptions(context);
      if (request.method === 'GET') return weatherGet(context);
      return new Response('Method not allowed', { status: 405 });
    }

    // === 其他请求：交给静态资源 ===
    return env.ASSETS.fetch(request);
  }
};
