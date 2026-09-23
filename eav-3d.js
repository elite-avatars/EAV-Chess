import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/+esm";

const FILES=["a","b","c","d","e","f","g","h"];

function colorFromHex(v,fallback){try{return new THREE.Color(v||fallback)}catch{return new THREE.Color(fallback)}}

function addMesh(group,geometry,material,y=0,scale=1){
  const m=new THREE.Mesh(geometry,material);
  m.castShadow=true;m.receiveShadow=true;m.position.y=y;m.scale.setScalar(scale);group.add(m);return m;
}

function pieceGeometry(piece,colorHex){
  const mat=new THREE.MeshStandardMaterial({color:colorFromHex(colorHex,"#ffffff"),metalness:.28,roughness:.34});
  const accent=new THREE.MeshStandardMaterial({color:0xd7b45a,metalness:.7,roughness:.22});
  const g=new THREE.Group();
  addMesh(g,new THREE.CylinderGeometry(.34,.43,.14,32),mat,.07);
  addMesh(g,new THREE.CylinderGeometry(.25,.33,.14,32),mat,.20);
  const stem=(h=.58,top=.16,bottom=.23,y=.53)=>addMesh(g,new THREE.CylinderGeometry(top,bottom,h,32),mat,y);
  if(piece.type==="p"){
    stem(.47,.14,.22,.48);addMesh(g,new THREE.SphereGeometry(.18,24,16),mat,.82);
  }else if(piece.type==="r"){
    stem(.62,.19,.27,.55);addMesh(g,new THREE.CylinderGeometry(.30,.25,.18,8),mat,.92);
    for(let i=0;i<4;i++){const b=addMesh(g,new THREE.BoxGeometry(.13,.16,.16),mat,1.08);b.position.x=Math.cos(i*Math.PI/2)*.20;b.position.z=Math.sin(i*Math.PI/2)*.20;}
  }else if(piece.type==="b"){
    stem(.68,.14,.25,.58);addMesh(g,new THREE.SphereGeometry(.19,24,16),mat,1.00);const tip=addMesh(g,new THREE.ConeGeometry(.12,.28,24),accent,1.23);tip.rotation.z=.16;
  }else if(piece.type==="n"){
    stem(.46,.18,.26,.48);
    const neck=addMesh(g,new THREE.BoxGeometry(.28,.52,.24),mat,.80);neck.rotation.z=-.22;neck.position.x=.05;
    const head=addMesh(g,new THREE.SphereGeometry(.22,24,16),mat,1.08);head.scale.set(1,.75,1.15);head.position.x=.13;
    const muzzle=addMesh(g,new THREE.BoxGeometry(.25,.18,.20),mat,1.02);muzzle.position.x=.30;
    const ear=addMesh(g,new THREE.ConeGeometry(.06,.18,12),accent,1.28);ear.position.x=.06;ear.rotation.z=-.18;
  }else if(piece.type==="q"){
    stem(.76,.14,.27,.62);addMesh(g,new THREE.SphereGeometry(.16,24,16),mat,1.10);
    addMesh(g,new THREE.TorusGeometry(.19,.035,10,32),accent,1.22);
    for(let i=0;i<5;i++){const p=addMesh(g,new THREE.ConeGeometry(.055,.25,12),accent,1.35);p.position.x=Math.cos(i*Math.PI*2/5)*.15;p.position.z=Math.sin(i*Math.PI*2/5)*.15;}
  }else{
    stem(.82,.15,.28,.65);addMesh(g,new THREE.SphereGeometry(.16,24,16),mat,1.16);
    const v=addMesh(g,new THREE.BoxGeometry(.09,.34,.09),accent,1.40);const h=addMesh(g,new THREE.BoxGeometry(.25,.09,.09),accent,1.47);
  }
  g.scale.setScalar(.72);
  return g;
}

export class EAV3DRenderer{
  constructor(container,{mode="table",onSquareClick=()=>{}}={}){
    this.container=container;this.mode=mode;this.onSquareClick=onSquareClick;this.selected=null;this.legal=[];this.orientation="white";this.lastMap=new Map();this.animations=[];this.drag={active:false,x:0,y:0,moved:false};this.theta=0;this.phi=1.04;this.radius=11.2;this.isMobile=false;this.userAdjustedRadius=false;this.isFullscreen=false;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(mode==="arena"?0x020608:0x0b0e0c);
    this.camera=new THREE.PerspectiveCamera(42,1,.1,100);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    container.innerHTML="";container.appendChild(this.renderer.domElement);
    this.boardRoot=new THREE.Group();this.scene.add(this.boardRoot);
    this.squareRoot=new THREE.Group();this.pieceRoot=new THREE.Group();this.boardRoot.add(this.squareRoot,this.pieceRoot);
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    this.buildEnvironment();this.buildBoard();
    this.bind();this.resize();this.animate();
  }
  buildEnvironment(){
    const amb=new THREE.HemisphereLight(this.mode==="arena"?0x7fa9a2:0xffe8c7,0x030504,this.mode==="arena"?1.18:1.05);this.scene.add(amb);
    const key=new THREE.DirectionalLight(0xfff4de,this.mode==="arena"?2.35:2.15);key.position.set(4.5,10,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);this.scene.add(key);
    const fill=new THREE.DirectionalLight(this.mode==="arena"?0x79d7c4:0xc9d7ff,this.mode==="arena"?.65:.42);fill.position.set(-5,6,-3);this.scene.add(fill);
    if(this.mode==="arena"){
      const teal=new THREE.PointLight(0x00d6c9,35,18,2);teal.position.set(-5,4,-2);this.scene.add(teal);
      const gold=new THREE.PointLight(0xd7b45a,30,16,2);gold.position.set(5,3,3);this.scene.add(gold);
      const count=220,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*28;pos[i*3+1]=Math.random()*13-2;pos[i*3+2]=(Math.random()-.5)*28}
      const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
      this.stars=new THREE.Points(geo,new THREE.PointsMaterial({color:0x8fa9a3,size:.035,transparent:true,opacity:.75}));this.scene.add(this.stars);
    }else{
      const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0x111512,roughness:.82,metalness:.05}));ground.rotation.x=-Math.PI/2;ground.position.y=-.57;ground.receiveShadow=true;this.scene.add(ground);
      const table=new THREE.Mesh(new THREE.BoxGeometry(10.5,.65,10.5),new THREE.MeshStandardMaterial({color:0x3a281c,roughness:.52,metalness:.05}));table.position.y=-.35;table.receiveShadow=true;table.castShadow=true;this.scene.add(table);
    }
  }
  buildBoard(){
    this.squareRoot.clear();
    const frameMat=new THREE.MeshStandardMaterial({color:0x2b332e,roughness:.38,metalness:.22});
    const base=new THREE.Mesh(new THREE.BoxGeometry(8.9,.32,8.9),frameMat);base.position.y=-.18;base.castShadow=true;base.receiveShadow=true;this.boardRoot.add(base);
    if(this.mode==="arena"){
      const glow=new THREE.Mesh(new THREE.BoxGeometry(9.15,.18,9.15),new THREE.MeshStandardMaterial({color:0xd7b45a,emissive:0xd7b45a,emissiveIntensity:1.5,metalness:.7,roughness:.18}));glow.position.y=-.34;this.boardRoot.add(glow);
    }
    for(let rank=1;rank<=8;rank++)for(let fi=0;fi<8;fi++){
      const sq=FILES[fi]+rank,light=(fi+rank)%2===1;
      const mat=new THREE.MeshStandardMaterial({color:light?0xe8dfc5:0x54705d,roughness:this.mode==="arena"?.34:.55,metalness:this.mode==="arena"?.24:.08,emissive:0x000000});
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.99,.12,.99),mat);
      mesh.position.set(fi-3.5,0,3.5-(rank-1));mesh.receiveShadow=true;mesh.userData.square=sq;mesh.userData.baseColor=mat.color.clone();this.squareRoot.add(mesh);
    }
    this.boardRoot.position.y=this.mode==="arena"?1.0:.04;
  }
  setTheme(theme){
    this.theme=theme||{};const light=colorFromHex(theme?.light,"#e8dfc5"),dark=colorFromHex(theme?.dark,"#54705d"),frame=colorFromHex(theme?.frame,"#2a332d");
    for(const s of this.squareRoot.children){const [f,r]=[s.userData.square[0],Number(s.userData.square[1])];const li=(FILES.indexOf(f)+r)%2===1;s.material.color.copy(li?light:dark);s.userData.baseColor=s.material.color.clone();}
    const base=this.boardRoot.children.find(x=>x.geometry?.type==="BoxGeometry"&&x!==this.squareRoot);if(base?.material)base.material.color.copy(frame);
    this.currentFen=null;
  }
  squareToPos(sq){const fi=FILES.indexOf(sq[0]),r=Number(sq[1]);return new THREE.Vector3(fi-3.5,.12,3.5-(r-1))}
  setPosition(chess,orientation="white",selected=null,legal=[]){
    this.orientation=orientation;this.selected=selected;this.legal=legal||[];
    const map=new Map();
    for(let r=1;r<=8;r++)for(const f of FILES){const sq=f+r,p=chess.get(sq);if(p)map.set(sq,{type:p.type,color:p.color})}
    const old=this.lastMap;
    this.highlight();
    const move=this.detectMove(old,map);
    if(move&&this.pieceRoot.children.length){this.animateMove(move,map)}else this.rebuildPieces(map);
    this.lastMap=map;
    this.setCameraOrientation();
  }
  detectMove(oldMap,newMap){
    if(!oldMap||oldMap.size===0)return null;
    const removed=[],added=[];
    for(const [sq,p] of oldMap){const n=newMap.get(sq);if(!n||n.type!==p.type||n.color!==p.color)removed.push([sq,p])}
    for(const [sq,p] of newMap){const o=oldMap.get(sq);if(!o||o.type!==p.type||o.color!==p.color)added.push([sq,p])}
    for(const [from,p] of removed){const match=added.find(([to,n])=>n.type===p.type&&n.color===p.color);if(match)return{from,to:match[0],piece:p}}
    return null;
  }
  rebuildPieces(map){
    this.pieceRoot.clear();
    for(const [sq,p] of map){const g=pieceGeometry(p,p.color==="w"?(this.theme?.white||"#f5f0df"):(this.theme?.black||"#151b17"));if(this.isMobile)g.scale.multiplyScalar(1.18);g.position.copy(this.squareToPos(sq));g.userData.square=sq;g.traverse(x=>x.userData.square=sq);this.pieceRoot.add(g)}
  }
  animateMove(move,map){
    const moving=this.pieceRoot.children.find(g=>g.userData.square===move.from);
    if(!moving){this.rebuildPieces(map);return}
    const captured=this.pieceRoot.children.find(g=>g.userData.square===move.to);if(captured&&captured!==moving)this.pieceRoot.remove(captured);
    const start=moving.position.clone(),end=this.squareToPos(move.to),t0=performance.now(),dur=420;
    moving.userData.square=move.to;moving.traverse(x=>x.userData.square=move.to);
    this.animations.push(()=>{const t=Math.min(1,(performance.now()-t0)/dur),e=1-Math.pow(1-t,3);moving.position.lerpVectors(start,end,e);moving.position.y=end.y+Math.sin(Math.PI*t)*.65;if(t>=1){moving.position.copy(end);this.rebuildPieces(map);return false}return true});
  }
  highlight(){
    for(const s of this.squareRoot.children){s.material.emissive.setHex(0x000000);s.material.emissiveIntensity=0}
    const mark=(sq,color,intensity)=>{const s=this.squareRoot.children.find(x=>x.userData.square===sq);if(s){s.material.emissive.setHex(color);s.material.emissiveIntensity=intensity}}
    if(this.selected)mark(this.selected,0xd7b45a,.8);for(const sq of this.legal)mark(sq,0x53d49a,.72);
  }
  setCameraOrientation(){
    const sign=this.orientation==="white"?1:-1;const x=Math.sin(this.theta)*this.radius, z=Math.cos(this.theta)*this.radius*sign;
    const targetY=this.mode==="arena"?.78:.08;
    this.camera.position.set(x,Math.sin(this.phi)*this.radius*.95,z);this.camera.lookAt(0,targetY,0);
  }
  zoom(direction=0){
    this.userAdjustedRadius=true;
    const min=this.isMobile?8.9:6.8,max=this.isMobile?16:15;
    this.radius=THREE.MathUtils.clamp(this.radius+(direction>0?-1.0:direction<0?1.0:0),min,max);
    this.setCameraOrientation();
    return this.radius;
  }
  resetZoom(){
    this.userAdjustedRadius=false;
    if(this.isFullscreen){
      this.radius=this.mode==="arena"?10.4:9.8;
      this.phi=this.mode==="arena"?1.12:1.08;
    }else if(this.isMobile){
      this.radius=this.mode==="arena"?11.7:11.2;
      this.phi=this.mode==="arena"?1.02:.98;
    }else{
      this.radius=this.mode==="arena"?11.3:11.0;
      this.phi=this.mode==="arena"?1.10:1.06;
    }
    this.setCameraOrientation();
    return this.radius;
  }
  bind(){
    const c=this.renderer.domElement;
    c.style.touchAction="pan-y";
    this.activePointers=new Map();this.pinchDistance=null;
    c.addEventListener("pointerdown",e=>{this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.activePointers.size===1){this.drag.active=true;this.drag.x=e.clientX;this.drag.y=e.clientY;this.drag.moved=false}c.setPointerCapture?.(e.pointerId)});
    c.addEventListener("pointermove",e=>{
      if(this.activePointers?.has(e.pointerId))this.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.activePointers?.size===2){
        const pts=[...this.activePointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
        if(this.pinchDistance!==null){
          const change=dist-this.pinchDistance;if(Math.abs(change)>2){this.userAdjustedRadius=true;const min=this.isMobile?8.9:6.8,max=this.isMobile?16:15;this.radius=THREE.MathUtils.clamp(this.radius-change*.018,min,max);this.setCameraOrientation()}
        }
        this.pinchDistance=dist;this.drag.moved=true;return;
      }
      if(!this.drag.active)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(dx)+Math.abs(dy)>2){this.theta-=dx*(this.isMobile?.0055:.008);if(!this.isMobile)this.phi=THREE.MathUtils.clamp(this.phi-dy*.005,.38,1.25);this.drag.x=e.clientX;this.drag.y=e.clientY;this.drag.moved=true;this.setCameraOrientation()}
    });
    const endPointer=e=>{const moved=this.drag.moved;this.activePointers?.delete(e.pointerId);if((this.activePointers?.size||0)<2)this.pinchDistance=null;if((this.activePointers?.size||0)===0){this.drag={active:false,x:0,y:0,moved:false};if(!moved)this.pick(e)}};
    c.addEventListener("pointerup",endPointer);c.addEventListener("pointercancel",endPointer);
    c.addEventListener("wheel",e=>{e.preventDefault();this.userAdjustedRadius=true;const min=this.isMobile?10.4:7.4,max=this.isMobile?16:15;this.radius=THREE.MathUtils.clamp(this.radius+Math.sign(e.deltaY)*.7,min,max);this.setCameraOrientation()},{passive:false});
    this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(this.container);
  }
  pick(e){
    const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.x=((e.clientX-rect.left)/rect.width)*2-1;this.pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects([this.pieceRoot,this.squareRoot],true);for(const h of hits){let o=h.object;while(o&&!o.userData.square)o=o.parent;if(o?.userData.square){this.onSquareClick(o.userData.square);break}}
  }
  resize(){
    const w=Math.max(280,this.container.clientWidth||650);
    this.isMobile=w<560||window.matchMedia?.("(pointer: coarse)")?.matches===true;
    const stage=this.container.closest(".three-stage");
    this.isFullscreen=(document.fullscreenElement===stage)||stage?.classList.contains("expanded-mobile")||false;
    const vh=Math.max(320,window.innerHeight||720);
    const h=this.isFullscreen?Math.round(Math.max(360,Math.min(vh*.80,w*.78))):(this.isMobile?Math.round(Math.max(300,Math.min(430,w*.92))):Math.round(Math.max(460,Math.min(690,w*.74))));
    this.container.style.height=h+"px";
    this.renderer.setSize(w,h,true);
    this.renderer.domElement.style.width="100%";
    this.renderer.domElement.style.height="100%";
    this.renderer.domElement.style.display="block";
    this.camera.aspect=w/h;
    this.camera.fov=this.isFullscreen?38:(this.isMobile?49:40);
    this.camera.updateProjectionMatrix();
    this.boardRoot.scale.setScalar(this.isFullscreen?1.04:(this.isMobile?(this.mode==="arena"?.94:.96):1));
    if(!this.userAdjustedRadius){
      if(this.isFullscreen){
        this.radius=this.mode==="arena"?10.4:9.8;
        this.phi=this.mode==="arena"?1.12:1.08;
      }else if(this.isMobile){
        this.radius=this.mode==="arena"?11.7:11.2;
        this.phi=this.mode==="arena"?1.02:.98;
      }else{
        this.radius=this.mode==="arena"?11.3:11.0;
        this.phi=this.mode==="arena"?1.10:1.06;
      }
    }
    this.setCameraOrientation();
  }
  animate(){
    this.raf=requestAnimationFrame(()=>this.animate());this.animations=this.animations.filter(fn=>fn());
    if(this.mode==="arena"){const bob=this.isMobile?.035:.09,spin=this.isMobile?.008:.025;this.boardRoot.position.y=1.0+Math.sin(performance.now()*.0012)*bob;this.boardRoot.rotation.y=Math.sin(performance.now()*.00022)*spin;if(this.stars)this.stars.rotation.y+=this.isMobile?.00008:.00018}
    this.renderer.render(this.scene,this.camera);
  }
  destroy(){cancelAnimationFrame(this.raf);this.ro?.disconnect();this.renderer.dispose();this.container.innerHTML=""}
}
