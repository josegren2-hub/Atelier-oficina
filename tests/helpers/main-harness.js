/**
 * A deliberately small DOM double for main.js orchestration tests, not a browser.
 * Loads the real index markup and runs main.js unchanged except for stripping its
 * static imports. Real data/roster/theme exports are injected; CSS, release notice,
 * WebGL scene and command-center integration are stubbed. No network or sockets.
 * Does not emulate layout, rendering, hit testing, top-layer focus trapping,
 * asynchronous native dialog events or full DOM/HTML/CSS semantics.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import * as data from '../../src/data.js';
import * as roster from '../../src/roster.js';
import {readNightPreference,saveNightPreference} from '../../src/theme-state.js';
import {SOURCE_CONTRACT} from '../../src/source-contract.js';
import {avatarPhotoUrl} from '../../src/avatar-photo.js';

const dataKey=name=>name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
const decode=text=>text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');

class Events {
 constructor(){this.listeners=new Map();}
 addEventListener(type,handler){const list=this.listeners.get(type)||[];list.push(handler);this.listeners.set(type,list);}
 dispatch(type,extra={}){
  const event={type,target:this,currentTarget:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};
  for(const handler of this.listeners.get(type)||[])handler(event);
  return event;
 }
}

class Element extends Events {
 constructor(tag,document){
  super();this.tagName=tag.toLowerCase();this.ownerDocument=document;this.parentNode=null;this.children=[];this.attributes=new Map();
  this.dataset=new Proxy({}, {set(object,key,value){object[key]=String(value);return true;}});
  this.className='';this.id='';this.hidden=false;this.open=false;this.checked=false;this.value='';this._text='';
  this.offsetLeft=0;this.offsetWidth=90;this.clientWidth=320;
  this.style={setProperty:(name,value)=>{this.style[name]=value;}};
  this.classList={toggle:(name,force)=>{const classes=new Set(this.className.split(/\s+/).filter(Boolean));const add=force??!classes.has(name);if(add)classes.add(name);else classes.delete(name);this.className=[...classes].join(' ');return add;}};
 }
 get isConnected(){let node=this;while(node.parentNode)node=node.parentNode;return node===this.ownerDocument.root;}
 get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
 set textContent(value){this.replaceChildren();this._text=String(value??'');}
 append(...nodes){
  for(const node of nodes){
   if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(child=>child!==node);
   node.parentNode=this;this.children.push(node);
   if(this.tagName==='select'&&node.tagName==='option'&&this.children.length===1)this.value=node.value;
  }
 }
 replaceChildren(...nodes){for(const node of this.children)node.parentNode=null;this.children=[];this._text='';this.append(...nodes);}
 setAttribute(name,value){
  const text=String(value);this.attributes.set(name,text);
  if(name.startsWith('data-'))this.dataset[dataKey(name)]=text;
  else if(name==='class')this.className=text;
  else if(name==='id')this.id=text;
  else if(name==='value')this.value=text;
  else if(['hidden','open','checked'].includes(name))this[name]=true;
 }
 getAttribute(name){
  if(name.startsWith('data-'))return this.dataset[dataKey(name)]??null;
  if(name==='class')return this.className||null;
  if(name==='id')return this.id||null;
  if(['hidden','open','checked'].includes(name))return this[name]?'':null;
  return this.attributes.get(name)??null;
 }
 matches(selector){
  // Only selectors used by main.js and these tests are supported; fail on others.
  const match=selector.match(/^(?:([a-z][\w-]*)|([#.][\w-]+))?(?:\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\])?$/i);
  if(!match||!match[0])throw new Error(`Unsupported harness selector: ${selector}`);
  const [,tag,identity,attribute,double,single,bare]=match;
  if(tag&&tag.toLowerCase()!==this.tagName)return false;
  if(identity?.startsWith('#')&&this.id!==identity.slice(1))return false;
  if(identity?.startsWith('.')&&!this.className.split(/\s+/).includes(identity.slice(1)))return false;
  if(attribute){const actual=this.getAttribute(attribute),expected=double??single??bare;if(actual===null||(expected!==undefined&&actual!==expected))return false;}
  return true;
 }
 querySelectorAll(selector){
  const parts=selector.trim().split(/\s+/),result=[];
  const visit=node=>{for(const child of node.children){
   if(child.tagName!=='#text'&&child.matches(parts.at(-1))){
    let ancestor=child.parentNode,index=parts.length-2;
    while(index>=0&&ancestor&&ancestor!==this.parentNode){if(ancestor.matches(parts[index]))index--;ancestor=ancestor.parentNode;}
    if(index<0)result.push(child);
   }
   visit(child);
  }};
  visit(this);return result;
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 focus(options){if(this.isConnected){this.ownerDocument.activeElement=this;this.lastFocusOptions=options;}}
 click(){this.focus();return this.dispatch('click');}
 showModal(){this.open=true;this.showModalCalls=(this.showModalCalls||0)+1;}
 close(){this.open=false;this.dispatch('close');}
 scrollTo(options){this.lastScroll=options;}
 scrollIntoView(options){this.lastScrollIntoView=options;}
}

class Document extends Events {
 constructor(html){
  super();this.root=new Element('root',this);
  const stack=[this.root],voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  for(const token of html.match(/<[^>]+>|[^<]+/g)||[]){
   if(token.startsWith('<!'))continue;
   if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
   if(token.startsWith('<')){
    const [,tag,attributes]=token.match(/^<([\w-]+)([^>]*)>$/)||[];
    if(!tag)throw new Error(`Unsupported harness HTML: ${token}`);
    const node=new Element(tag,this);
    for(const match of attributes.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))node.setAttribute(match[1],decode(match[2]??match[3]??match[4]??''));
    stack.at(-1).append(node);
    if(!voids.has(tag.toLowerCase())&&!token.endsWith('/>'))stack.push(node);
   }else{const node=new Element('#text',this);node._text=decode(token);stack.at(-1).append(node);}
  }
  this.documentElement=this.querySelector('html');this.body=this.querySelector('body');this.activeElement=this.body;this.hidden=false;
  if(!this.documentElement||!this.body)throw new Error('Harness requires an HTML document with body');
 }
 createElement(tag){return new Element(tag,this);}
 querySelector(selector){return this.root.querySelector(selector);}
 querySelectorAll(selector){return this.root.querySelectorAll(selector);}
 getElementById(id){return this.querySelector('#'+id);}
}

export function createMemoryStorage(initial={}){
 const values=new Map(Object.entries(initial));
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),values};
}

export function createMainHarness({storage=createMemoryStorage()}={}){
 const document=new Document(fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8'));
 const intervals=[],errors=[],sceneCalls=[],commandCalls=[];
 let sceneCallbacks,commandCallbacks;
 const scene={
  floor:-1,mode:'exterior',night:false,selected:null,
  setView(id){sceneCalls.push(['setView',id]);this.floor=id;},
  setMode(mode){sceneCalls.push(['setMode',mode]);this.mode=mode;this.floor=-1;},
  setNight(night){sceneCalls.push(['setNight',night]);this.night=night;},
  select(id){sceneCalls.push(['select',id]);this.selected=id;},
  setDemo(value){this.demo=value;},setStatuses(snapshot){this.snapshot=snapshot;},
  setWalls(value){this.walls=value;},rotate(value){sceneCalls.push(['rotate',value]);},zoom(value){sceneCalls.push(['zoom',value]);},reset(){sceneCalls.push(['reset']);},
  getActivity(){return {label:'Postura de prueba · ejemplo'};},getMovementStats(){return {agents:[]};}
 };
 const command={
  open(section){commandCalls.push(['open',section]);},openAgenda(id){commandCalls.push(['openAgenda',id]);},refresh(){commandCalls.push(['refresh']);},close(){commandCalls.push(['close']);}
 };
 const source=fs.readFileSync(new URL('../../src/main.js',import.meta.url),'utf8');
 // Intentionally fail if future imports become multiline or dynamic rather than
 // quietly deleting application code. No application function is reimplemented.
 const executable=source.replace(/^import [^\n]+;\r?$/gm,'');
 if(/^\s*import\b/m.test(executable))throw new Error('Harness needs an explicit update for new import syntax');
 const historyStack=[{atelierBack:'inicio'}];
 const history={
  get state(){return historyStack.at(-1);},
  replaceState(state){historyStack[0]=state;},
  pushState(state){historyStack.push(state);},
 };
 const windowListeners=new Map();
 const context=vm.createContext({
  document,...data,...roster,SOURCE_CONTRACT,avatarPhotoUrl,console:{...console,error:(...args)=>errors.push(args.map(a=>a&&a.message?a.message:a))},
  history,
  addEventListener:(type,fn)=>{const list=windowListeners.get(type)||[];list.push(fn);windowListeners.set(type,list);},
  removeEventListener:(type,fn)=>{const list=windowListeners.get(type)||[];windowListeners.set(type,list.filter(x=>x!==fn));},
  readNightPreference:()=>readNightPreference(storage),saveNightPreference:night=>saveNightPreference(night,storage),
  readSnapshot:async()=>{throw new Error('Harness: live fetch disabled');},
  mountReleaseNotice:()=>{},
  mountCommandCenter:callbacks=>{commandCallbacks=callbacks;return command;},
  mountEquipoPanel:()=>({refresh(){},open(){},fold(){},isOpen(){return false;},destroy(){},element:{}}),
  mountSelectionLabels:()=>({refresh(){},destroy(){},element:{}}),
  mountHistoryBack:()=>({push(){},destroy(){}}),
  mountPizarron:()=>({open(){},close(){},isOpen(){return false;},refresh(){},destroy(){},element:{}}),
  buildPizarronModel:()=>({unlocked:false,aud:[],esp:[],pend:[],gen:null}),
  createMandoSession:({onChange}={})=>{
    const api={unlocked:false,mando:null,tareas:null,unlock:async()=>({unlocked:true}),tryRestore:async()=>({unlocked:false}),refresh:async()=>({unlocked:false}),lock(){api.unlocked=false;onChange?.({unlocked:false});return {unlocked:false};},snapshot:()=>({unlocked:false}),enrichBot:b=>({...b,mandoUnlocked:false}),botRecord:()=>null};
    return api;
  },
  createOffice:(container,onChoose,onStats,onAgenda,onFloor)=>{sceneCallbacks={container,onChoose,onAgenda,onFloor};onStats({loaded:16,failed:0});return scene;},
  matchMedia:()=>({matches:true}),setInterval:callback=>{intervals.push(callback);return intervals.length;},clearInterval:()=>{}
 });
 vm.runInContext(executable,context,{filename:'src/main.js (real body; injected imports)',timeout:1000});
 if(errors.length)throw new Error(`Unexpected main.js initialization errors: ${JSON.stringify(errors)}`);
 const get=selector=>{const node=document.querySelector(selector);if(!node)throw new Error(`Missing node: ${selector}`);return node;};
 return {
  document,storage,scene,sceneCalls,commandCalls,intervals,get,
  all:selector=>document.querySelectorAll(selector),
  click:selector=>get(selector).click(),
  change:(selector,value)=>{const node=get(selector);if(node.tagName==='input'&&node.getAttribute('type')==='checkbox')node.checked=value;else node.value=String(value);node.dispatch('change');},
  input:(selector,value)=>{const node=get(selector);node.value=value;node.dispatch('input');},
  cancelDetail:()=>get('#detail').dispatch('cancel'),
  pickAvatar:id=>sceneCallbacks.onChoose(id),chooseFromCommand:id=>commandCallbacks.onChoose(id),
  pickFloor:id=>sceneCallbacks.onFloor(id),openSceneAgenda:id=>sceneCallbacks.onAgenda(id),
  tick:()=>intervals.forEach(callback=>callback())
 };
}
