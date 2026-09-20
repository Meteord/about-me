import"./chunk-FOHPRMQF-B9nQyF5k.js";import"./chunk-6AZGARVD-WBET6zvI.js";import"./chunk-6TQVIW2G-CzlQurHg.js";import"./chunk-6EIED4P4-CuafFvYM.js";import"./chunk-KI3K4JFJ-BbuiJqYR.js";import"./chunk-5V3GS4D5-BOYO99V-.js";import"./chunk-UY3FDG6J-BAr9l5U7.js";import"./chunk-3Z5EZCMW-BhgOPiMY.js";import"./chunk-I5DQTOEV-DFPfC-wq.js";import"./chunk-OUJLGHUK-DXwELSGK.js";import"./chunk-XHIXRSVI-Dr84buGZ.js";import"./chunk-2ZTRR5NV-DjaQT7VZ.js";import"./chunk-747NJXEK-DqBWqqTx.js";import"./chunk-IH6LHLGP-DZ2JX8nz.js";import"./chunk-6K3QC6MW-DUUuPKRf.js";import"./chunk-ICYGCRZG-X60g9z7U.js";import{c as e}from"./chunk-Y2CYZVJY-CCT2jiMK.js";import{o as t}from"./src-CUT9mzkt.js";import{B as n,Q as r,R as i,V as a,f as o,i as s,m as c,s as l,t as u,u as d,y as f}from"./chunk-O7XYJQB3-BwirFelV.js";import"./dist-BDa23362.js";import{f as p}from"./chunk-ZIGJFQKS-DKJFcuNM.js";import{b as m}from"./chunk-6AEJRKK7-CxI78dxJ.js";import{b as h}from"./chunk-JWPE2WC7-CxqXuJ8y.js";import{c as g}from"./mermaid-parser.core-PHpBzXIx.js";var _={showLegend:!0,ticks:5,max:null,min:0,graticule:`circle`},v=32,y={axes:[],curves:[],options:_},b=structuredClone(y),x=c.radar,S=e(()=>{let e=p({...x,...d().radar});return e},`getConfig`),C=e(()=>b.axes,`getAxes`),w=e(()=>b.curves,`getCurves`),T=e(()=>b.options,`getOptions`),E=e(e=>{b.axes=e.map(e=>({name:e.name,label:e.label??e.name}))},`setAxes`),D=e(e=>{b.curves=e.map(e=>({name:e.name,label:e.label??e.name,entries:O(e.entries)}))},`setCurves`),O=e(e=>{if(e[0].axis==null)return e.map(e=>e.value);let t=C();if(t.length===0)throw Error(`Axes must be populated before curves for reference entries`);return t.map(t=>{let n=e.find(e=>e.axis?.$refText===t.name);if(n===void 0)throw Error(`Missing entry for axis `+t.label);return n.value})},`computeCurveEntries`),k=e(e=>{let n=e.reduce((e,t)=>(e[t.name]=t,e),{});b.options={showLegend:n.showLegend?.value??_.showLegend,ticks:n.ticks?.value??_.ticks,max:n.max?.value??_.max,min:n.min?.value??_.min,graticule:n.graticule?.value??_.graticule},b.options.ticks>v&&(t.warn(`Radar diagram ticks (${b.options.ticks}) exceeds maximum allowed (${v}). Using ${v} instead.`),b.options.ticks=v)},`setOptions`),A=e(()=>{o(),b=structuredClone(y)},`clear`),j={getAxes:C,getCurves:w,getOptions:T,setAxes:E,setCurves:D,setOptions:k,getConfig:S,clear:A,setAccTitle:i,getAccTitle:u,setDiagramTitle:a,getDiagramTitle:f,getAccDescription:l,setAccDescription:r},M=e(e=>{h(e,j);let{axes:t,curves:n,options:r}=e;j.setAxes(t),j.setCurves(n),j.setOptions(r)},`populate`),N={parse:e(async e=>{let n=await g(`radar`,e);t.debug(n),M(n)},`parse`)},P=e((e,t,n,r)=>{let i=r.db,a=i.getAxes(),o=i.getCurves(),s=i.getOptions(),c=i.getConfig(),l=i.getDiagramTitle(),u=m(t),d=F(u,c),f=s.max??Math.max(...o.map(e=>Math.max(...e.entries))),p=s.min,h=Math.min(c.width,c.height)/2;I(d,a,h,s.ticks,s.graticule),L(d,a,h,c),R(d,a,o,p,f,s.graticule,c),V(d,o,s.showLegend,c),d.append(`text`).attr(`class`,`radarTitle`).text(l).attr(`x`,0).attr(`y`,-c.height/2-c.marginTop)},`draw`),F=e((e,t)=>{let n=t.width+t.marginLeft+t.marginRight,r=t.height+t.marginTop+t.marginBottom,i={x:t.marginLeft+t.width/2,y:t.marginTop+t.height/2};return s(e,r,n,t.useMaxWidth??!0),e.attr(`viewBox`,`0 0 ${n} ${r}`).attr(`overflow`,`visible`),e.append(`g`).attr(`transform`,`translate(${i.x}, ${i.y})`)},`drawFrame`),I=e((e,t,n,r,i)=>{if(i===`circle`)for(let t=0;t<r;t++){let i=n*(t+1)/r;e.append(`circle`).attr(`r`,i).attr(`class`,`radarGraticule`)}else if(i===`polygon`){let i=t.length;for(let a=0;a<r;a++){let o=n*(a+1)/r,s=t.map((e,t)=>{let n=2*t*Math.PI/i-Math.PI/2,r=o*Math.cos(n),a=o*Math.sin(n);return`${r},${a}`}).join(` `);e.append(`polygon`).attr(`points`,s).attr(`class`,`radarGraticule`)}}},`drawGraticule`),L=e((e,t,n,r)=>{let i=t.length;for(let a=0;a<i;a++){let o=t[a].label,s=2*a*Math.PI/i-Math.PI/2,c=Math.cos(s),l=Math.sin(s);e.append(`line`).attr(`x1`,0).attr(`y1`,0).attr(`x2`,n*r.axisScaleFactor*c).attr(`y2`,n*r.axisScaleFactor*l).attr(`class`,`radarAxisLine`);let u=c>.01?`start`:c<-.01?`end`:`middle`,d=l>.01?`hanging`:l<-.01?`auto`:`central`,f=4;e.append(`text`).text(o).attr(`x`,n*r.axisLabelFactor*c+f*c).attr(`y`,n*r.axisLabelFactor*l+f*l).attr(`text-anchor`,u).attr(`dominant-baseline`,d).attr(`class`,`radarAxisLabel`)}},`drawAxes`);function R(e,t,n,r,i,a,o){let s=t.length,c=Math.min(o.width,o.height)/2;n.forEach((t,n)=>{if(t.entries.length!==s)return;let l=t.entries.map((e,t)=>{let n=2*Math.PI*t/s-Math.PI/2,a=z(e,r,i,c),o=a*Math.cos(n),l=a*Math.sin(n);return{x:o,y:l}});a===`circle`?e.append(`path`).attr(`d`,B(l,o.curveTension)).attr(`class`,`radarCurve-${n}`):a===`polygon`&&e.append(`polygon`).attr(`points`,l.map(e=>`${e.x},${e.y}`).join(` `)).attr(`class`,`radarCurve-${n}`)})}e(R,`drawCurves`);function z(e,t,n,r){let i=Math.min(Math.max(e,t),n);return r*(i-t)/(n-t)}e(z,`relativeRadius`);function B(e,t){let n=e.length,r=`M${e[0].x},${e[0].y}`;for(let i=0;i<n;i++){let a=e[(i-1+n)%n],o=e[i],s=e[(i+1)%n],c=e[(i+2)%n],l={x:o.x+(s.x-a.x)*t,y:o.y+(s.y-a.y)*t},u={x:s.x-(c.x-o.x)*t,y:s.y-(c.y-o.y)*t};r+=` C${l.x},${l.y} ${u.x},${u.y} ${s.x},${s.y}`}return`${r} Z`}e(B,`closedRoundCurve`);function V(e,t,n,r){if(!n)return;let i=(r.width/2+r.marginRight)*3/4,a=-(r.height/2+r.marginTop)*3/4,o=20;t.forEach((t,n)=>{let r=e.append(`g`).attr(`transform`,`translate(${i}, ${a+n*o})`);r.append(`rect`).attr(`width`,12).attr(`height`,12).attr(`class`,`radarLegendBox-${n}`),r.append(`text`).attr(`x`,16).attr(`y`,0).attr(`class`,`radarLegendText`).text(t.label)})}e(V,`drawLegend`);var H={draw:P},U=e((e,t)=>{let n=``;for(let r=0;r<e.THEME_COLOR_LIMIT;r++){let i=e[`cScale${r}`];n+=`
		.radarCurve-${r} {
			color: ${i};
			fill: ${i};
			fill-opacity: ${t.curveOpacity};
			stroke: ${i};
			stroke-width: ${t.curveStrokeWidth};
		}
		.radarLegendBox-${r} {
			fill: ${i};
			fill-opacity: ${t.curveOpacity};
			stroke: ${i};
		}
		`}return n},`genIndexStyles`),W=e(e=>{let t=n(),r=d(),i=p(t,r.themeVariables),a=p(i.radar,e);return{themeVariables:i,radarOptions:a}},`buildRadarStyleOptions`),G=e(({radar:e}={})=>{let{themeVariables:t,radarOptions:n}=W(e);return`
	.radarTitle {
		font-size: ${t.fontSize};
		color: ${t.titleColor};
		dominant-baseline: hanging;
		text-anchor: middle;
	}
	.radarAxisLine {
		stroke: ${n.axisColor};
		stroke-width: ${n.axisStrokeWidth};
	}
	.radarAxisLabel {
		font-size: ${n.axisLabelFontSize}px;
		color: ${n.axisColor};
	}
	.radarGraticule {
		fill: ${n.graticuleColor};
		fill-opacity: ${n.graticuleOpacity};
		stroke: ${n.graticuleColor};
		stroke-width: ${n.graticuleStrokeWidth};
	}
	.radarLegendText {
		text-anchor: start;
		font-size: ${n.legendFontSize}px;
		dominant-baseline: hanging;
	}
	${U(t,n)}
	`},`styles`),K={parser:N,db:j,renderer:H,styles:G};export{K as diagram};