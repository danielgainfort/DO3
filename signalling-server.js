'use strict';
const http=require('http');
const express=require('express');
const {Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:process.env.CLIENT_ORIGIN||'*',methods:['GET','POST']}});
const rooms=new Map();
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function code(){return LETTERS[Math.floor(Math.random()*26)]+LETTERS[Math.floor(Math.random()*26)]+LETTERS[Math.floor(Math.random()*26)]}
function freshCode(){for(let i=0;i<200;i++){const c=code();if(!rooms.has(c))return c}return null}
function clean(v){v=String(v||'').toUpperCase().replace(/[^A-Z]/g,'');return /^[A-Z]{3}$/.test(v)?v:null}
function removeSocket(socket){for(const [room,r] of rooms){if(r.host===socket.id||r.guest===socket.id){const other=r.host===socket.id?r.guest:r.host;if(other)io.to(other).emit('peer-left');rooms.delete(room)}}}
app.get('/',(_,res)=>res.type('text').send('Dolphin Olympics 3 signalling server'));
io.on('connection',socket=>{
 socket.on('create-room',(_,ack=()=>{})=>{removeSocket(socket);const room=freshCode();if(!room)return ack({ok:false,error:'No room code available'});rooms.set(room,{host:socket.id,guest:null});socket.join(room);ack({ok:true,room})});
 socket.on('join-room',({room}={},ack=()=>{})=>{room=clean(room);if(!room)return ack({ok:false,error:'Room code must be three letters'});const r=rooms.get(room);if(!r)return ack({ok:false,error:'Room not found'});if(r.guest)return ack({ok:false,error:'Room is full'});r.guest=socket.id;socket.join(room);ack({ok:true,room});io.to(r.host).emit('peer-joined')});
 socket.on('signal',({room,data}={})=>{room=clean(room);const r=room&&rooms.get(room);if(!r||!data)return;const target=socket.id===r.host?r.guest:socket.id===r.guest?r.host:null;if(target)io.to(target).emit('signal',data)});
 socket.on('leave-room',()=>removeSocket(socket));
 socket.on('disconnect',()=>removeSocket(socket));
});
const port=process.env.PORT||3000;server.listen(port,()=>console.log(`DO3 signalling on ${port}`));
