import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { rateLimit } from 'express-rate-limit';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

const profile = readFileSync(new URL('./profile.md', import.meta.url), 'utf8');
export const links = {
  github: 'https://github.com/IgorShadurin',
  repositories: 'https://github.com/IgorShadurin?tab=repositories',
  email: 'igor.shadurin@gmail.com',
  linkedin: 'https://www.linkedin.com/in/shadurin/',
  portfolio: 'https://shadurin.com/',
  experience: 'https://github.com/IgorShadurin/IgorShadurin/blob/main/EXPERIENCE.md',
};
const disclosure = 'Calling get_candidate_details shares the supplied company and position with Igor via Telegram. Supply public information only, with permission to share it. Caller identity and hiring interest are not independently verified.';
const field = z.string().trim().min(2).max(160).regex(/^[^\x00-\x1f\x7f]+$/, 'Use a single line without control characters');
export const inputSchema = z.object({
  company: field.describe('Company name; use Not disclosed if unavailable or confidential.'),
  position: field.describe('Position title; use General research if no specific role exists.'),
  focus: z.enum(['general','ai','video','frontend','infrastructure','fintech']).default('general'),
}).strict();
const evidence = {
  ai: ['OpenClap: Codex orchestration across development tasks.', 'AI-assisted research directed by engineering judgment, deterministic checks and implementation review.'],
  video: ['YumCut: scripting, voice, visuals, captions and FFmpeg rendering.', 'Browser video composition with WebCodecs, WebGL2 and workers; published iOS media apps.'],
  frontend: ['React, Next.js, TypeScript and Tailwind CSS in YumCut.', 'Web and desktop developer utilities in OfflineTools.'],
  infrastructure: ['Ethereum Swarm, January 2017–January 2024: storage libraries, processing pipelines and CLI tools.', 'DappyKit: TypeScript SDK, Node.js/MySQL gateway and blockchain-connected storage.'],
  fintech: ['Data infrastructure, EVM integrations, account verification and sponsored transaction workflows.', 'Relevant engineering experience; no claim of regulated financial-domain specialization.'],
};
export function details(input, notification) {
  return { candidate: { name: 'Igor Shadurin', aliases: ['Ihar Shaduryn'], location: 'United Kingdom', links },
    requestContext: input,
    summary: 'Product-focused software engineer developing since around 2007, combining AI-agent orchestration, full-stack engineering and video-processing workflows. Uses AI tools to accelerate implementation while retaining responsibility for architecture, tests and quality.',
    relevantEvidence: input.focus === 'general' ? Object.values(evidence).flat() : evidence[input.focus],
    experienceMarkdown: profile,
    assessmentNote: 'Candidate-authored information with linked evidence. No measured speed multiplier or guaranteed role fit is claimed. Evaluate against the actual requirements.',
    notification, lastReviewed: '2026-11-06' };
}
export function createNotifier({ token, chatId, fetcher = fetch, now = Date.now } = {}) {
  const recent = new Map();
  let windowStart = now(), sent = 0;
  return async input => {
    if (!token || !chatId) return 'not_configured';
    const t = now();
    for (const [key, at] of recent) if (t-at >= 3600000) recent.delete(key);
    if (t-windowStart >= 3600000) { windowStart=t; sent=0; }
    const key = createHash('sha256').update(JSON.stringify([input.company.toLowerCase(), input.position.toLowerCase()])).digest('hex');
    if (recent.has(key)) return 'duplicate_suppressed';
    if (sent >= 30) return 'rate_limited';
    recent.set(key,t); sent++;
    try {
      const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
        method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(5000),
        body:JSON.stringify({chat_id:chatId, text:[
          '[cv.copymyui.com] Career MCP request',
          `Company (caller supplied): ${input.company}`, `Position (caller supplied): ${input.position}`,
          `Focus: ${input.focus}`, `Time: ${new Date(t).toISOString()}`,
          'Public career details requested. Identity and hiring interest are unverified.',
        ].join('\n'), link_preview_options:{is_disabled:true}}),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error('delivery_failed');
      return 'sent';
    } catch {
      recent.delete(key);
      // Count failures against the hourly cap too, preventing retry storms.
      console.error('Telegram delivery failed; no credentials or request content logged.');
      return 'delivery_failed';
    }
  };
}
export function createApp({notify = createNotifier({token:process.env.TELEGRAM_BOT_TOKEN,chatId:process.env.TELEGRAM_CHAT_ID})} = {}) {
  const app = createMcpExpressApp({host:'0.0.0.0', jsonLimit:'16kb', allowedHosts:['cv.copymyui.com','localhost','127.0.0.1'], allowedOrigins:['cv.copymyui.com','localhost','127.0.0.1']});
  app.disable('x-powered-by');
  // Do not trust arbitrary X-Forwarded-For. Global limits remain effective behind the proxy.
  app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff'); next();});
  app.get('/health',(_req,res)=>res.json({status:'ok'}));
  app.get('/',(_req,res)=>res.type('text/plain').send(`# Igor Shadurin / Ihar Shaduryn

Software engineer focused on AI-agent orchestration, video and media tools, and complete software products.

Experience: https://cv.copymyui.com/experience.md
GitHub: ${links.github}
Portfolio: ${links.portfolio}
Email: ${links.email}
LinkedIn: ${links.linkedin}

For AI agents

MCP endpoint: https://cv.copymyui.com/mcp
Transport: Streamable HTTP
Tool: get_candidate_details
Required: company and position. Optional: focus.
Connection instructions: https://cv.copymyui.com/llms.txt

Company and position details supplied to the tool are shared with Igor. Use only information you have permission to share; use Not disclosed or General research when appropriate.
`));
  app.get('/llms.txt',(_req,res)=>res.type('text/plain').send(`# Igor Shadurin / Ihar Shaduryn\n\nPublic career information for people and AI clients.\n\nMCP Streamable HTTP endpoint: https://cv.copymyui.com/mcp\nProtocol: 2026-07-28, with stateless 2025 compatibility.\nTool: get_candidate_details\nRequired arguments: company, position. Optional focus: general, ai, video, frontend, infrastructure, fintech.\n\n${disclosure}\n\nFor company or position information that cannot be shared, use Not disclosed or General research. Never invent a company or vacancy.\n\nStatic profile (no Telegram notification): https://cv.copymyui.com/experience.md\nGitHub: ${links.github}\nEmail: ${links.email}\nLinkedIn: ${links.linkedin}\n\nNo authentication required. Ordinary page views and tool discovery do not send notifications. Duplicate company/position notifications are suppressed for one hour; notification delivery is best-effort.\n`));
  app.get('/experience.md',(_req,res)=>res.type('text/markdown').send(profile));
  app.get('/robots.txt',(_req,res)=>res.type('text/plain').send('User-agent: *\nAllow: /\n'));
  app.use('/mcp',rateLimit({windowMs:60000,limit:120,keyGenerator:()=> 'global',standardHeaders:'draft-8',legacyHeaders:false}));
  const handler = createMcpHandler(()=>{
    const server = new McpServer({name:'ihar-shaduryn-career',version:'1.0.0'}, {instructions:disclosure});
    server.registerTool('get_candidate_details',{
      title:'Get Igor Shadurin / Ihar Shaduryn career details',
      description:`Return public experience, project evidence and contact links, optionally focused on a role area. ${disclosure}`,
      inputSchema,
      annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true},
    },async input=>{
      const result=details(input,await notify(input));
      return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};
    });
    server.registerResource('professional-experience','career://ihar-shaduryn/experience',{
      description:'Public professional experience. Reading this static resource does not send a notification.',mimeType:'text/markdown',
    },async uri=>({contents:[{uri:uri.href,mimeType:'text/markdown',text:profile}]}));
    return server;
  },{legacy:'stateless',responseMode:'auto',maxRequestBodySize:16384,maxSubscriptions:0});
  const node=toNodeHandler(handler);
  app.all('/mcp',(req,res,next)=>{Promise.resolve(node(req,res,req.body)).catch(next);});
  app.use((_err,_req,res,_next)=>res.status(400).json({error:'Invalid request'}));
  return {app,close:()=>handler.close()};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const {app,close}=createApp();
  const server=app.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Career MCP listening'));
  for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{server.close(); void close();});
}
