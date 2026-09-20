import{c as e}from"./chunk-Y2CYZVJY-CCT2jiMK.js";import{o as t}from"./src-CUT9mzkt.js";import{B as n,N as r,f as i,i as a,u as o,v as s}from"./chunk-O7XYJQB3-BwirFelV.js";import{b as c}from"./chunk-6AEJRKK7-CxI78dxJ.js";var l=``,u=``,d=``,f=[],p=new Map,m=e(e=>r(e,s()),`sanitizeText`),h=e(e=>{switch(e.type){case`terminal`:return{...e,value:m(e.value)};case`nonterminal`:return{...e,name:m(e.name)};case`sequence`:return{...e,elements:e.elements.map(h)};case`choice`:return{...e,alternatives:e.alternatives.map(h)};case`optional`:return{...e,element:h(e.element)};case`repetition`:return{...e,element:h(e.element),separator:e.separator?h(e.separator):void 0};case`special`:return{...e,text:m(e.text)}}},`sanitizeAstNode`),g=e(()=>{l=``,u=``,d=``,f.length=0,p.clear(),i(),t.debug(`[Railroad] Database cleared`)},`clear`),_=e(e=>{l=m(e),t.debug(`[Railroad] Title set:`,e)},`setTitle`),v=e(()=>l,`getTitle`),y=e(e=>{let n={...e,name:m(e.name),definition:h(e.definition),comment:e.comment?m(e.comment):void 0};t.debug(`[Railroad] Adding rule:`,n.name),p.has(n.name)&&t.warn(`[Railroad] Rule '${n.name}' is already defined. Overwriting.`),f.push(n),p.set(n.name,n)},`addRule`),b=e(()=>f,`getRules`),x=e(e=>p.get(e),`getRule`),S=e(e=>{u=m(e).replace(/^\s+/g,``),t.debug(`[Railroad] Accessibility title set:`,e)},`setAccTitle`),C=e(()=>u,`getAccTitle`),w=e(e=>{d=m(e).replace(/\n\s+/g,`
`),t.debug(`[Railroad] Accessibility description set:`,e)},`setAccDescription`),T=e(()=>d,`getAccDescription`),E=_,D=v,O={clear:g,setTitle:_,getTitle:v,addRule:y,getRules:b,getRule:x,setAccTitle:S,getAccTitle:C,setAccDescription:w,getAccDescription:T,setDiagramTitle:E,getDiagramTitle:D},k={compactMode:!1,padding:10,verticalSeparation:8,horizontalSeparation:10,arcRadius:10,fontSize:14,fontFamily:`monospace`,terminalFill:`#FFFFC0`,terminalStroke:`#000000`,terminalTextColor:`#000000`,nonTerminalFill:`#FFFFFF`,nonTerminalStroke:`#000000`,nonTerminalTextColor:`#000000`,lineColor:`#000000`,strokeWidth:2,markerFill:`#000000`,commentFill:`#E8E8E8`,commentStroke:`#888888`,commentTextColor:`#666666`,specialFill:`#F0E0FF`,specialStroke:`#8800CC`,ruleNameColor:`#000066`,showMarkers:!0,markerRadius:5},A=/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$|^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([\d\s%+,./-]+\)$|^[a-z]+$/i,j=/^[\w "',.-]+$/,M=new Set([`compactMode`,`padding`,`verticalSeparation`,`horizontalSeparation`,`arcRadius`,`fontSize`,`fontFamily`,`terminalFill`,`terminalStroke`,`terminalTextColor`,`nonTerminalFill`,`nonTerminalStroke`,`nonTerminalTextColor`,`lineColor`,`strokeWidth`,`markerFill`,`commentFill`,`commentStroke`,`commentTextColor`,`specialFill`,`specialStroke`,`ruleNameColor`,`showMarkers`,`markerRadius`]),N=e(e=>e?Object.keys(e).every(e=>e===`railroad`||M.has(e)):!1,`isRailroadStyleOptions`),P=e(e=>e?`railroad`in e&&e.railroad?e.railroad:N(e)?e:{}:{},`extractRailroadOverrides`),F=e(e=>{if(!e||N(e))return{};let{railroad:t,svgId:n,theme:r,look:i,...a}=e;return a},`extractThemeOverrides`),I=e((e,t)=>{if(typeof e!=`string`)return t;let n=e.trim();return A.test(n)?n:t},`sanitizeColorValue`),L=e((e,t)=>{if(typeof e!=`string`)return t;let n=e.trim();return j.test(n)?n:t},`sanitizeFontFamilyValue`),R=e((e,t)=>{let n=typeof e==`number`?e:typeof e==`string`?Number.parseFloat(e):NaN;return Number.isFinite(n)&&n>=0?n:t},`sanitizeNumberValue`),z=e(e=>{let t=typeof e==`number`?e:typeof e==`string`?Number.parseFloat(e):NaN;return Number.isFinite(t)&&t>0?t:void 0},`parseThemeFontSize`),B=e(e=>{let t=L(e.fontFamily,k.fontFamily),n=z(e.fontSize)??k.fontSize;return{...k,fontFamily:t,fontSize:n,terminalFill:I(e.secondBkg??e.secondaryColor,k.terminalFill),terminalStroke:I(e.secondaryBorderColor??e.lineColor,k.terminalStroke),terminalTextColor:I(e.secondaryTextColor??e.textColor,k.terminalTextColor),nonTerminalFill:I(e.mainBkg??e.background,k.nonTerminalFill),nonTerminalStroke:I(e.primaryBorderColor??e.lineColor,k.nonTerminalStroke),nonTerminalTextColor:I(e.primaryTextColor??e.textColor,k.nonTerminalTextColor),lineColor:I(e.lineColor,k.lineColor),markerFill:I(e.lineColor,k.markerFill),commentFill:I(e.labelBackground??e.tertiaryColor,k.commentFill),commentStroke:I(e.tertiaryBorderColor??e.lineColor,k.commentStroke),commentTextColor:I(e.tertiaryTextColor??e.textColor,k.commentTextColor),specialFill:I(e.tertiaryColor??e.secondaryColor,k.specialFill),specialStroke:I(e.tertiaryBorderColor??e.secondaryBorderColor,k.specialStroke),ruleNameColor:I(e.titleColor??e.textColor,k.ruleNameColor)}},`buildThemeDefaults`),V=e(e=>{let t=o(),r={...n(),...t.themeVariables??{},...F(e)},i=B(r),a={...t.railroad??{},...P(e)};return{compactMode:a.compactMode??i.compactMode,padding:R(a.padding,i.padding),verticalSeparation:R(a.verticalSeparation,i.verticalSeparation),horizontalSeparation:R(a.horizontalSeparation,i.horizontalSeparation),arcRadius:R(a.arcRadius,i.arcRadius),fontSize:R(a.fontSize,i.fontSize),fontFamily:L(a.fontFamily,i.fontFamily),terminalFill:I(a.terminalFill,i.terminalFill),terminalStroke:I(a.terminalStroke,i.terminalStroke),terminalTextColor:I(a.terminalTextColor,i.terminalTextColor),nonTerminalFill:I(a.nonTerminalFill,i.nonTerminalFill),nonTerminalStroke:I(a.nonTerminalStroke,i.nonTerminalStroke),nonTerminalTextColor:I(a.nonTerminalTextColor,i.nonTerminalTextColor),lineColor:I(a.lineColor,i.lineColor),strokeWidth:R(a.strokeWidth,i.strokeWidth),markerFill:I(a.markerFill,i.markerFill),commentFill:I(a.commentFill,i.commentFill),commentStroke:I(a.commentStroke,i.commentStroke),commentTextColor:I(a.commentTextColor,i.commentTextColor),specialFill:I(a.specialFill,i.specialFill),specialStroke:I(a.specialStroke,i.specialStroke),ruleNameColor:I(a.ruleNameColor,i.ruleNameColor),showMarkers:a.showMarkers??i.showMarkers,markerRadius:R(a.markerRadius,i.markerRadius)}},`buildRailroadStyleOptions`),H=e(e=>{let{fontFamily:t,fontSize:n,terminalFill:r,terminalStroke:i,terminalTextColor:a,nonTerminalFill:o,nonTerminalStroke:s,nonTerminalTextColor:c,lineColor:l,strokeWidth:u,markerFill:d,commentFill:f,commentStroke:p,commentTextColor:m,specialFill:h,specialStroke:g,ruleNameColor:_}=V(e);return`
  .railroad-diagram {
    font-family: ${t};
    font-size: ${n}px;
  }

  .railroad-terminal rect {
    fill: ${r};
    stroke: ${i};
    stroke-width: ${u}px;
  }

  .railroad-terminal text {
    fill: ${a};
    font-family: ${t};
    font-size: ${n}px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .railroad-nonterminal rect {
    fill: ${o};
    stroke: ${s};
    stroke-width: ${u}px;
  }

  .railroad-nonterminal text {
    fill: ${c};
    font-family: ${t};
    font-size: ${n}px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .railroad-line {
    stroke: ${l};
    stroke-width: ${u}px;
    fill: none;
  }

  .railroad-start circle,
  .railroad-end circle {
    fill: ${d};
  }

  .railroad-comment ellipse {
    fill: ${f};
    stroke: ${p};
    stroke-width: ${u}px;
  }

  .railroad-comment text {
    fill: ${m};
    font-style: italic;
    font-family: ${t};
    font-size: ${n}px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .railroad-special rect {
    fill: ${h};
    stroke: ${g};
    stroke-width: ${u}px;
    stroke-dasharray: 5,3;
  }

  .railroad-special text {
    fill: ${c};
    font-family: ${t};
    font-size: ${n}px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .railroad-rule-name {
    font-weight: bold;
    fill: ${_};
    font-family: ${t};
    font-size: ${n}px;
  }

  .railroad-group {
    /* Grouping container, no specific styles */
  }
`},`getStyles`),U=class{constructor(){this.d=``}static#_=e(this,`PathBuilder`);moveTo(e,t){return this.d+=`M ${e} ${t} `,this}lineTo(e,t){return this.d+=`L ${e} ${t} `,this}horizontalTo(e){return this.d+=`H ${e} `,this}verticalTo(e){return this.d+=`V ${e} `,this}arcTo(e,t,n,r,i,a,o){return this.d+=`A ${e} ${t} ${n} ${r?1:0} ${i?1:0} ${a} ${o} `,this}build(){return this.d.trim()}},W=class{constructor(e,t=V()){this.textCache=new Map,this.svg=e,this.config=t}static#_=e(this,`RailroadRenderer`);measureText(e){if(this.textCache.has(e))return this.textCache.get(e);let t=this.svg.append(`text`).attr(`font-family`,this.config.fontFamily).attr(`font-size`,this.config.fontSize).text(e),n=t.node().getBBox(),r={width:n.width,height:n.height};return t.remove(),this.textCache.set(e,r),r}renderTerminal(e,t){let n=this.measureText(t),r=n.width+this.config.padding*2,i=n.height+this.config.padding*2,a=e.append(`g`).attr(`class`,`railroad-terminal`);return a.append(`rect`).attr(`x`,0).attr(`y`,0).attr(`width`,r).attr(`height`,i).attr(`rx`,10).attr(`ry`,10),a.append(`text`).attr(`x`,r/2).attr(`y`,i/2).text(t),{element:a.node(),dimensions:{width:r,height:i,up:i/2,down:i/2}}}renderNonTerminal(e,t){let n=this.measureText(t),r=n.width+this.config.padding*2,i=n.height+this.config.padding*2,a=e.append(`g`).attr(`class`,`railroad-nonterminal`);return a.append(`rect`).attr(`x`,0).attr(`y`,0).attr(`width`,r).attr(`height`,i),a.append(`text`).attr(`x`,r/2).attr(`y`,i/2).text(t),{element:a.node(),dimensions:{width:r,height:i,up:i/2,down:i/2}}}renderSequence(e,t){let n=t.map(t=>this.renderExpression(e,t)),r=0,i=0,a=0;for(let e of n)r+=e.dimensions.width,i=Math.max(i,e.dimensions.up),a=Math.max(a,e.dimensions.down);r+=(n.length-1)*this.config.horizontalSeparation;let o=e.append(`g`).attr(`class`,`railroad-sequence`),s=0;for(let e=0;e<n.length;e++){let t=n[e],r=i-t.dimensions.up,a=o.node().appendChild(t.element);if(a.setAttribute(`transform`,`translate(${s}, ${r})`),e<n.length-1){let e=s+t.dimensions.width,n=e+this.config.horizontalSeparation,r=i;o.append(`path`).attr(`class`,`railroad-line`).attr(`d`,new U().moveTo(e,r).lineTo(n,r).build())}s+=t.dimensions.width+this.config.horizontalSeparation}return{element:o.node(),dimensions:{width:r,height:i+a,up:i,down:a}}}renderChoice(e,t){let n=t.map(t=>this.renderExpression(e,t)),r=0,i=0;for(let e of n)r=Math.max(r,e.dimensions.width),i+=e.dimensions.height;i+=(n.length-1)*this.config.verticalSeparation;let a=this.config.arcRadius,o=a*4,s=r+o,c=e.append(`g`).attr(`class`,`railroad-choice`),l=0,u=i/2;for(let e of n){let t=l,n=t+e.dimensions.up,i=a*2+(r-e.dimensions.width)/2,o=c.node().appendChild(e.element);o.setAttribute(`transform`,`translate(${i}, ${t})`);let d=new U,f=n>u;n===u?d.moveTo(0,u).lineTo(i,n):d.moveTo(0,u).arcTo(a,a,0,!1,f,a,u+(f?a:-a)).lineTo(a,n-(f?a:-a)).arcTo(a,a,0,!1,!f,a*2,n).lineTo(i,n),c.append(`path`).attr(`class`,`railroad-line`).attr(`d`,d.build());let p=new U,m=i+e.dimensions.width,h=s-a*2;n===u?p.moveTo(m,n).lineTo(s,u):p.moveTo(m,n).lineTo(h,n).arcTo(a,a,0,!1,!f,s-a,n+(f?-a:a)).lineTo(s-a,u+(f?a:-a)).arcTo(a,a,0,!1,f,s,u),c.append(`path`).attr(`class`,`railroad-line`).attr(`d`,p.build()),l+=e.dimensions.height+this.config.verticalSeparation}return{element:c.node(),dimensions:{width:s,height:i,up:u,down:i-u}}}renderOptional(e,t){let n=this.renderExpression(e,t),r=this.config.arcRadius,i=r*2,a=n.dimensions.width+r*4,o=n.dimensions.height+i,s=e.append(`g`).attr(`class`,`railroad-optional`),c=r*2,l=i,u=s.node().appendChild(n.element);u.setAttribute(`transform`,`translate(${c}, ${l})`);let d=l+n.dimensions.up,f=new U().moveTo(0,d).lineTo(r*2,d);s.append(`path`).attr(`class`,`railroad-line`).attr(`d`,f.build());let p=new U().moveTo(c+n.dimensions.width,d).lineTo(a,d);s.append(`path`).attr(`class`,`railroad-line`).attr(`d`,p.build());let m=new U().moveTo(0,d).arcTo(r,r,0,!1,!1,r,d-r).lineTo(r,r).arcTo(r,r,0,!1,!0,r*2,0).lineTo(a-r*2,0).arcTo(r,r,0,!1,!0,a-r,r).lineTo(a-r,d-r).arcTo(r,r,0,!1,!1,a,d);return s.append(`path`).attr(`class`,`railroad-line`).attr(`d`,m.build()),{element:s.node(),dimensions:{width:a,height:o,up:d,down:o-d}}}renderRepetition(e,t,n){let r=this.renderExpression(e,t),i=this.config.arcRadius,a=i*2,o=r.dimensions.width+i*4,s=n===0,c=r.dimensions.height+a+(s?a:0),l=e.append(`g`).attr(`class`,`railroad-repetition`),u=i*2,d=s?a:0,f=l.node().appendChild(r.element);f.setAttribute(`transform`,`translate(${u}, ${d})`);let p=d+r.dimensions.up;l.append(`path`).attr(`class`,`railroad-line`).attr(`d`,new U().moveTo(0,p).lineTo(i*2,p).build()),l.append(`path`).attr(`class`,`railroad-line`).attr(`d`,new U().moveTo(u+r.dimensions.width,p).lineTo(o,p).build());let m=d+r.dimensions.height+i,h=new U().moveTo(u+r.dimensions.width,p).arcTo(i,i,0,!1,!0,u+r.dimensions.width+i,p+i).lineTo(u+r.dimensions.width+i,m).arcTo(i,i,0,!1,!0,u+r.dimensions.width,m+i).lineTo(i*2,m+i).arcTo(i,i,0,!1,!0,i,m).lineTo(i,p+i).arcTo(i,i,0,!1,!0,i*2,p);if(l.append(`path`).attr(`class`,`railroad-line`).attr(`d`,h.build()),s){let e=new U().moveTo(0,p).arcTo(i,i,0,!1,!1,i,p-i).lineTo(i,i).arcTo(i,i,0,!1,!0,i*2,0).lineTo(o-i*2,0).arcTo(i,i,0,!1,!0,o-i,i).lineTo(o-i,p-i).arcTo(i,i,0,!1,!1,o,p);l.append(`path`).attr(`class`,`railroad-line`).attr(`d`,e.build())}return{element:l.node(),dimensions:{width:o,height:c,up:p,down:c-p}}}renderSpecial(e,t){let n=this.measureText(`? `+t+` ?`),r=n.width+this.config.padding*2,i=n.height+this.config.padding*2,a=e.append(`g`).attr(`class`,`railroad-special`);return a.append(`rect`).attr(`x`,0).attr(`y`,0).attr(`width`,r).attr(`height`,i),a.append(`text`).attr(`x`,r/2).attr(`y`,i/2).text(`? `+t+` ?`),{element:a.node(),dimensions:{width:r,height:i,up:i/2,down:i/2}}}renderExpression(e,t){switch(t.type){case`terminal`:return this.renderTerminal(e,t.value);case`nonterminal`:return this.renderNonTerminal(e,t.name);case`sequence`:return this.renderSequence(e,t.elements);case`choice`:return this.renderChoice(e,t.alternatives);case`optional`:return this.renderOptional(e,t.element);case`repetition`:return this.renderRepetition(e,t.element,t.min);case`special`:return this.renderSpecial(e,t.text);default:throw Error(`Unknown node type: ${t.type}`)}}renderRule(e,t){let n=this.svg.append(`g`).attr(`class`,`railroad-rule`).attr(`transform`,`translate(0, ${t})`),r=e.name+` =`,i=this.measureText(r).width+20,a=i+20,o=n.append(`g`),s=this.renderExpression(o,e.definition),c=Math.max(20,s.dimensions.up),l=c-s.dimensions.up;o.attr(`transform`,`translate(${a}, ${l})`);let u=n.append(`g`).attr(`class`,`railroad-rule-name-group`);u.append(`text`).attr(`class`,`railroad-rule-name`).attr(`x`,0).attr(`y`,c).text(r);let d=n.append(`g`).attr(`class`,`railroad-start`);d.append(`circle`).attr(`cx`,i).attr(`cy`,c).attr(`r`,this.config.markerRadius);let f=n.append(`g`).attr(`class`,`railroad-end`);return f.append(`circle`).attr(`cx`,a+s.dimensions.width+10).attr(`cy`,c).attr(`r`,this.config.markerRadius),n.append(`path`).attr(`class`,`railroad-line`).attr(`d`,new U().moveTo(i+this.config.markerRadius,c).lineTo(a,c).build()),n.append(`path`).attr(`class`,`railroad-line`).attr(`d`,new U().moveTo(a+s.dimensions.width,c).lineTo(a+s.dimensions.width+10-this.config.markerRadius,c).build()),{height:Math.max(40,l+s.dimensions.height+this.config.padding*2),width:a+s.dimensions.width+10+this.config.markerRadius}}renderDiagram(e){let t=this.config.padding,n=0;for(let r of e){let e=this.renderRule(r,t);t+=e.height+this.config.verticalSeparation,n=Math.max(n,e.width)}return{width:n+this.config.padding*2,height:t+this.config.padding}}},G=e((e,t,n)=>{a(e,t.height,t.width,n),e.attr(`viewBox`,`0 0 ${t.width} ${t.height}`)},`configureRailroadSvgSize`),K=e((e,n,r)=>{t.debug(`[Railroad] Rendering diagram
`+e);try{let e=c(n);e.attr(`class`,`railroad-diagram`);let r=o().railroad,i=r?.useMaxWidth??!0,a=O.getRules();if(t.debug(`[Railroad] Rendering ${a.length} rules`),a.length===0){t.warn(`[Railroad] No rules to render`),G(e,{height:100,width:200},i);return}let s=new W(e,V()),l=s.renderDiagram(a);G(e,l,i),t.debug(`[Railroad] Render complete`)}catch(e){throw t.error(`[Railroad] Render error:`,e),e}},`draw`),q={draw:K};export{O as b,H as c,q as d};