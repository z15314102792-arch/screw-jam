const fs=require('fs');
const html=fs.readFileSync('C:/screw-jam/index.html','utf8');
const parts=html.split('<script>');
const js=parts[parts.length-1].split('</script>')[0];
// Remove the Game instantiation at the end
const clean=js.replace(/const G = new Game\(\);?\s*$/, '');
// Mock document
const doc={
  getElementById:()=>({classList:{add:()=>{},remove:()=>{},contains:()=>false},textContent:'',style:{}}),
  addEventListener:()=>{},
  querySelector:()=>({}),
  querySelectorAll:()=>[],
  createElement:()=>({style:{}}),
  body:{appendChild:()=>{}},
  documentElement:{style:{}}
};
global.document=doc;
global.window={addEventListener:()=>{},dispatchEvent:()=>{},scrollTo:()=>{},devicePixelRatio:1,
  AudioContext:class{constructor(){this.currentTime=0;this.destination={};this.sampleRate=44100}
    createOscillator(){return{type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},detune:{setValueAtTime(){}},connect(){},start(){},stop(){}}}
    createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},value:0},connect(){}}}
    createBiquadFilter(){return{type:'',frequency:{value:0},Q:{value:0},connect(){}}}
    createBuffer(){return{getChannelData(){return new Float32Array(1)}}}
    createBufferSource(){return{buffer:null,connect(){},start(){},stop(){}}}
  }};
global.navigator={userAgent:''};
global.WeixinJSBridge=undefined;
eval(clean);
console.log('OK');
