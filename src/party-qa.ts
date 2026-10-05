// Opt-in integration checks run normal pointer handlers against actual media time.
// Full mode plays Golden twice at 1x. No seeks, fake clocks or state mutations.
type Evidence = {
  mode:string; state:{x:number;z:number;nearest:string}; routeLength:number;
  party:{active:boolean;starting:boolean;finished:boolean;seconds:number;motionTime:number;interactions:number;celebrations:number;magicHits:number;magicVisible:boolean;finaleCount:number;groupTime:number;responses:number[];pulses:number[];effectTime:number;particleCapacity:number;stage:{x:number;y:number;z:number;visible:boolean}[]};
  music:{mode:string;playing:boolean;currentTime:number;duration:number;loop:boolean;ended:boolean;playbackRate:number;muted:boolean};
  models:{status:string}[];
  performance:{fps:number;p95Ms:number;drawCalls:number;triangles:number;geometries:number;textures:number};
};
const evidence=()=>(window as unknown as {__STARLIGHT__:{snapshot():Evidence}}).__STARLIGHT__.snapshot();
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const element=(selector:string)=>document.querySelector<HTMLElement>(selector)!;
const click=(selector:string)=>element(selector).click();
async function until(check:()=>boolean,timeout=20000){const start=performance.now();while(!check()){if(performance.now()-start>timeout)throw new Error('Timed out waiting for party behavior');await wait(80);}}
function tap(selector:string,id=71,cancel=false){
  const target=element(selector),r=target.getBoundingClientRect();
  for(const type of ['pointerdown',cancel?'pointercancel':'pointerup'])target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0,buttons:type==='pointerdown'?1:0}));
}
export function runPartyQA(){
  const panel=document.createElement('pre');panel.id='party-qa-result';panel.style.cssText='position:fixed;z-index:100;right:12px;top:90px;max-width:300px;max-height:22vh;overflow:auto;white-space:pre-wrap;background:#fff9e8e8;color:#49385e;padding:12px;border-radius:12px;font:11px monospace;pointer-events:none';
  const start=document.createElement('button');start.id='party-qa-start';start.textContent='RUN PARTY CHECKS';start.style.cssText='position:fixed;z-index:101;right:15px;top:10px;padding:18px;border-radius:14px;background:#ffe09b;color:#513c66';document.body.append(panel,start);
  const checks:string[]=[],errors:string[]=[],profiles:unknown[]=[];
  window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  const assert=(ok:unknown,label:string)=>{if(!ok)throw new Error(label);checks.push(`PASS ${label}`);panel.textContent=checks.join('\n');};
  start.addEventListener('click',async()=>{
    start.remove();const full=new URLSearchParams(location.search).get('partyqa')!=='short';
    try{
      click('#play');await until(()=>evidence().models.every(m=>m.status==='ready'));click('[data-travel="stage"]');
      await until(()=>evidence().state.nearest==='stage'&&evidence().routeLength===0);
      const home={...evidence().state};assert(!element('#party-start').hidden,'stage presents Golden Party invitation');click('#party-start');
      await until(()=>evidence().mode==='party'&&!evidence().party.starting&&evidence().music.currentTime>.2);
      assert(evidence().music.mode==='local'&&!evidence().music.loop&&evidence().music.playbackRate===1,'one local Golden playback at normal speed with a natural ending');
      assert(evidence().party.stage.every(p=>p.visible&&Math.abs(p.y-.26)<.01&&Math.abs(p.z+11.15)<.01)&&new Set(evidence().party.stage.map(p=>p.x)).size===3,'three existing girls stand together on the concert stage');
      const rects=[0,1,2].map(i=>element(`#party-pad-${i}`).getBoundingClientRect());
      assert(rects.every(r=>r.width>=90&&r.height>=100&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight)&&rects[1].left-rects[0].right>=10&&rects[2].left-rects[1].right>=10,'large separated touch pads fit viewport');
      for(let i=0;i<5;i++){tap(`#party-pad-${i%3}`,71+i);await wait(90);assert(evidence().party.responses[i%3]>0,'tap immediately animates its character '+(i+1));}
      assert(evidence().party.interactions===5&&evidence().party.celebrations===1&&evidence().party.groupTime>0,'exactly five interactions trigger group celebration');
      tap('#party-pad-0',81,true);tap('#party-pad-2',82);await wait(80);
      assert(evidence().party.interactions===7,'separate touch pointers and cancellation produce no duplicate taps');
      click('#party-pause');const frozen=evidence();tap('#party-pad-1');await wait(400);
      assert(evidence().mode==='pause'&&Math.abs(evidence().music.currentTime-frozen.music.currentTime)<.1&&evidence().party.interactions===7,'pause freezes audio and blocks hidden activity input');
      click('#resume');await wait(250);assert(evidence().mode==='party'&&evidence().music.currentTime>=frozen.music.currentTime,'resume continues the same song position');
      click('#party-mute');assert(evidence().music.muted&&evidence().music.playing,'party mute uses the existing music control');click('#party-mute');
      if(full){
        for(let run=0;run<2;run++){
          let lastTap=-1,lastProgress=-1,invited=false,ignored=false;
          const startTime=evidence().music.currentTime,wall=performance.now();
          while(!evidence().party.finished){
            const e=evidence();const seconds=e.music.currentTime;
            if(performance.now()-wall>360000)throw new Error('Golden did not reach its natural end');
            invited ||= e.party.pulses.some(n=>n>0);
            if(seconds>29&&!ignored){assert(e.party.magicHits===0,'ignored first magic invitation has no penalty, run '+(run+1));ignored=true;}
            if(seconds-lastTap>2.7){tap(`#party-pad-${Math.floor(seconds/2.7)%3}`);lastTap=seconds;}
            if(seconds>30&&e.party.magicVisible){tap('#party-magic');}
            if(Math.floor(seconds/10)!==lastProgress){lastProgress=Math.floor(seconds/10);panel.textContent=checks.join('\n')+`\nPlaying complete Golden ${run+1}/2: ${seconds.toFixed(1)} / ${e.music.duration.toFixed(1)} seconds (1x)`;}
            await wait(100);
          }
          const e=evidence();
          assert(e.music.ended&&e.music.duration>100&&e.music.currentTime>=e.music.duration-.1&&(performance.now()-wall)/1000>=e.music.duration-startTime-1,'natural full-track ending at 1x, run '+(run+1));
          assert(invited&&e.party.magicHits>0&&e.party.finaleCount===1&&e.party.groupTime>0&&!element('#party-replay').hidden,'invitations, magic, finale and obvious replay, run '+(run+1));
          assert(e.performance.fps>=45&&e.performance.p95Ms<40&&e.performance.drawCalls<220,'full-song party performance, run '+(run+1));
          profiles.push({run:run+1,duration:e.music.duration,wallSeconds:(performance.now()-wall)/1000,interactions:e.party.interactions,magicHits:e.party.magicHits,performance:e.performance});
          tap('#party-pad-0');assert(evidence().party.interactions===e.party.interactions+1,'pads remain playable after finale');
          await wait(200);assert(evidence().party.motionTime>e.party.motionTime,'finale animation continues after audio ends');
          if(run===0){click('#party-replay');await until(()=>!evidence().party.starting&&evidence().music.currentTime<1);assert(evidence().party.interactions===0&&!evidence().party.finished,'immediate replay resets the authored timeline and interactions');}
        }
      }else{
        await until(()=>evidence().party.magicVisible,30000);tap('#party-magic');assert(evidence().party.magicHits===1&&evidence().party.groupTime>0,'large magical invitation celebrates all three');
      }
      click('#party-back');await wait(250);
      assert(evidence().mode==='play'&&evidence().state.x===home.x&&evidence().state.z===home.z&&evidence().music.loop,'BACK restores hub location and normal music looping');
      assert(!evidence().party.active&&evidence().party.effectTime===0,'exit clears temporary activity effects');
      let resources:{geometries:number;textures:number}|undefined;
      for(let i=0;i<12;i++){
        click('#interact');click('#party-start');await until(()=>!evidence().party.starting&&evidence().mode==='party');
        tap('#party-pad-0');tap('#party-pad-1');tap('#party-pad-2');await wait(160);click('#party-back');await wait(140);
        if(i===1)resources=evidence().performance;
      }
      const after=evidence().performance;
      assert(after.geometries===resources!.geometries&&after.textures===resources!.textures,'twelve returns keep warmed GPU resources fixed');
      assert(evidence().party.particleCapacity===24,'party reuses the existing 24-star pool');
      assert(errors.length===0,'no runtime errors');
      panel.textContent=`ALL ${checks.length} PARTY CHECKS PASSED\n${checks.join('\n')}\n${JSON.stringify({viewport:[innerWidth,innerHeight],fullSessions:full?2:0,profiles,resources,after,errors})}`;
    }catch(error){panel.textContent=`FAIL ${String(error)}\n${checks.join('\n')}\n${JSON.stringify({errors,evidence:evidence()})}`;}
  },{once:true});
}
