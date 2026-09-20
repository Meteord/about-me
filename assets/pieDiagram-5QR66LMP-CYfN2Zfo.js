import"./chunk-FOHPRMQF-B9nQyF5k.js";import"./chunk-6AZGARVD-WBET6zvI.js";import"./chunk-6TQVIW2G-CzlQurHg.js";import"./chunk-6EIED4P4-CuafFvYM.js";import"./chunk-KI3K4JFJ-BbuiJqYR.js";import"./chunk-5V3GS4D5-BOYO99V-.js";import"./chunk-UY3FDG6J-BAr9l5U7.js";import"./chunk-3Z5EZCMW-BhgOPiMY.js";import"./chunk-I5DQTOEV-DFPfC-wq.js";import"./chunk-OUJLGHUK-DXwELSGK.js";import"./chunk-XHIXRSVI-Dr84buGZ.js";import"./chunk-2ZTRR5NV-DjaQT7VZ.js";import"./chunk-747NJXEK-DqBWqqTx.js";import"./chunk-IH6LHLGP-DZ2JX8nz.js";import"./chunk-6K3QC6MW-DUUuPKRf.js";import"./chunk-ICYGCRZG-X60g9z7U.js";import{c as e}from"./chunk-Y2CYZVJY-CCT2jiMK.js";import{o as t}from"./src-CUT9mzkt.js";import{Q as n,R as r,V as i,f as a,i as o,m as s,s as c,t as l,v as u,y as d}from"./chunk-O7XYJQB3-B8BbPATB.js";import{b as f}from"./ordinal-BE-0oCoK.js";import{c as p}from"./path-CZoF8_eB.js";import"./init-1gj9RZMg.js";import{o as m}from"./dist-BDa23362.js";import{b as h}from"./arc-BeXnXnMB.js";import{b as g}from"./array-BDV5MbVI.js";import{f as _,o as v}from"./chunk-ZIGJFQKS-BjZUmyic.js";import{b as y}from"./chunk-6AEJRKK7-CeLEXmkg.js";import{b}from"./chunk-JWPE2WC7-CxqXuJ8y.js";import{c as x}from"./mermaid-parser.core-6PnQVrFf.js";function S(e,t){return t<e?-1:t>e?1:t>=e?0:NaN}function C(e){return e}function w(){var e=C,t=S,n=null,r=p(0),i=p(m),a=p(0);function o(o){var s,c=(o=g(o)).length,l,u,d=0,f=Array(c),p=Array(c),h=+r.apply(this,arguments),_=Math.min(m,Math.max(-m,i.apply(this,arguments)-h)),v,y=Math.min(Math.abs(_)/c,a.apply(this,arguments)),b=y*(_<0?-1:1),x;for(s=0;s<c;++s)(x=p[f[s]=s]=+e(o[s],s,o))>0&&(d+=x);for(t==null?n!=null&&f.sort(function(e,t){return n(o[e],o[t])}):f.sort(function(e,n){return t(p[e],p[n])}),s=0,u=d?(_-c*b)/d:0;s<c;++s,h=v)l=f[s],x=p[l],v=h+(x>0?x*u:0)+b,p[l]={data:o[l],index:s,value:x,startAngle:h,endAngle:v,padAngle:y};return p}return o.value=function(t){return arguments.length?(e=typeof t==`function`?t:p(+t),o):e},o.sortValues=function(e){return arguments.length?(t=e,n=null,o):t},o.sort=function(e){return arguments.length?(n=e,t=null,o):n},o.startAngle=function(e){return arguments.length?(r=typeof e==`function`?e:p(+e),o):r},o.endAngle=function(e){return arguments.length?(i=typeof e==`function`?e:p(+e),o):i},o.padAngle=function(e){return arguments.length?(a=typeof e==`function`?e:p(+e),o):a},o}var T=s.pie,E={sections:new Map,showData:!1,config:T},D=E.sections,O=E.showData,k=structuredClone(T),A=e(()=>structuredClone(k),`getConfig`),j=e(()=>{D=new Map,O=E.showData,a()},`clear`),M=e(({label:e,value:n})=>{if(n<0)throw Error(`"${e}" has invalid value: ${n}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);D.has(e)||(D.set(e,n),t.debug(`added new section: ${e}, with value: ${n}`))},`addSection`),N=e(()=>D,`getSections`),P=e(e=>{O=e},`setShowData`),F=e(()=>O,`getShowData`),I={getConfig:A,clear:j,setDiagramTitle:i,getDiagramTitle:d,setAccTitle:r,getAccTitle:l,setAccDescription:n,getAccDescription:c,addSection:M,getSections:N,setShowData:P,getShowData:F},L=e((e,t)=>{b(e,t),t.setShowData(e.showData),e.sections.map(t.addSection)},`populateDb`),R={parse:e(async e=>{let n=await x(`pie`,e);t.debug(n),L(n,I)},`parse`)},z=e(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieCircle.highlighted{
    scale: 1.05;
    opacity: 1;
  }
  .pieCircle.highlightedOnHover:hover{
    transition-duration: 250ms;
    scale: 1.05;
    opacity: 1;
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,`getStyles`),B=z,V=e(e=>{let t=[...e.values()].reduce((e,t)=>e+t,0),n=[...e.entries()].map(([e,t])=>({label:e,value:t})).filter(e=>e.value/t*100>=1),r=w().value(e=>e.value).sort(null);return r(n)},`createPieArcs`),H=e((e,n,r,i)=>{t.debug(`rendering pie chart
`+e);let a=i.db,s=u(),c=_(a.getConfig(),s.pie),l=40,d=18,p=4,m=450,g=m,b=y(n),x=b.append(`g`);x.attr(`transform`,`translate(`+g/2+`,`+m/2+`)`);let{themeVariables:S}=s,[C]=v(S.pieOuterStrokeWidth);C??=2;let w=c.legendPosition,T=c.textPosition,E=c.donutHole>0&&c.donutHole<=.9?c.donutHole:0,D=Math.min(g,m)/2-l,O=h().innerRadius(E*D).outerRadius(D),k=h().innerRadius(D*T).outerRadius(D*T),A=x.append(`g`);A.append(`circle`).attr(`cx`,0).attr(`cy`,0).attr(`r`,D+C/2).attr(`class`,`pieOuterCircle`);let j=a.getSections(),M=V(j),N=[S.pie1,S.pie2,S.pie3,S.pie4,S.pie5,S.pie6,S.pie7,S.pie8,S.pie9,S.pie10,S.pie11,S.pie12],P=0;j.forEach(e=>{P+=e});let F=M.filter(e=>(e.data.value/P*100).toFixed(0)!==`0`),I=f(N).domain([...j.keys()]);A.selectAll(`mySlices`).data(F).enter().append(`path`).attr(`d`,O).attr(`fill`,e=>I(e.data.label)).attr(`class`,e=>{let t=`pieCircle`;return c.highlightSlice===`hover`?t+=` highlightedOnHover`:c.highlightSlice===e.data.label&&(t+=` highlighted`),t}),A.selectAll(`mySlices`).data(F).enter().append(`text`).text(e=>(e.data.value/P*100).toFixed(0)+`%`).attr(`transform`,e=>`translate(`+k.centroid(e)+`)`).style(`text-anchor`,`middle`).attr(`class`,`slice`);let L=x.append(`text`).text(a.getDiagramTitle()).attr(`x`,0).attr(`y`,-(m-50)/2).attr(`class`,`pieTitleText`),R=[...j.entries()].map(([e,t])=>({label:e,value:t})),z=x.selectAll(`.legend`).data(R).enter().append(`g`).attr(`class`,`legend`);z.append(`rect`).attr(`width`,d).attr(`height`,d).style(`fill`,e=>I(e.label)).style(`stroke`,e=>I(e.label)),z.append(`text`).attr(`x`,d+p).attr(`y`,d-p).text(e=>a.getShowData()?`${e.label} [${e.value}]`:e.label);let B=Math.max(...z.selectAll(`text`).nodes().map(e=>e?.getBoundingClientRect().width??0)),H=m,U=g+l,W=d+p,G=R.length*W;switch(w){case`center`:z.attr(`transform`,(e,t)=>{let n=W*R.length/2,r=-B/2-(d+p),i=t*W-n;return`translate(`+r+`,`+i+`)`});break;case`top`:H+=G,z.attr(`transform`,(e,t)=>{let n=D,r=-B/2-(d+p),i=t*W-n;return`translate(${r}, ${i})`}),A.attr(`transform`,()=>`translate(0, ${G+W})`);break;case`bottom`:H+=G,z.attr(`transform`,(e,t)=>{let n=-D-W,r=-B/2-(d+p),i=t*W-n;return`translate(`+r+`,`+i+`)`});break;case`left`:U+=d+p+B,z.attr(`transform`,(e,t)=>{let n=W*R.length/2,r=-D-(d+p),i=t*W-n;return`translate(`+r+`,`+i+`)`}),A.attr(`transform`,()=>`translate(${B+d+p}, 0)`);break;case`right`:default:U+=d+p+B,z.attr(`transform`,(e,t)=>{let n=W*R.length/2,r=12*d,i=t*W-n;return`translate(`+r+`,`+i+`)`});break}let K=L.node()?.getBoundingClientRect().width??0,q=g/2-K/2,J=g/2+K/2,Y=Math.min(0,q),X=Math.max(U,J),Z=X-Y;b.attr(`viewBox`,`${Y} 0 ${Z} ${H}`),o(b,H,Z,c.useMaxWidth)},`draw`),U={draw:H},W={parser:R,db:I,renderer:U,styles:B};export{W as diagram};