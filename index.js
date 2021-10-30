const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const playercolors = ["red","DarkRed","yellow","green","aqua","navy","blue","purple","DeepPink","brown","DarkGreen","Indigo","Lime"];
const xsize = 1024;
const ysize = 768;
const safex = 200; //size not location.
const safey = 200;

class Sprite {
  constructor(xxx, yyy, sss, ccc) {
    this.x = xxx; //x
    this.y = yyy; //y
    this.s = sss; //size
    this.c = ccc ; //color
    this.vx = 0;//start with 0 velocity
    this.vy = 0;
  }
  draw(){
    context.fillStyle = this.c; //color specified
    context.fillRect(this.x-this.s/2, this.y-this.s/2, this.s, this.s);	
  }
  
  update1(){
    this.x = this.x + this.vx; //Increments position according to velocity.
    this.y = this.y + this.vy;
  }
  shove(dir, mag){//directions are 0 down 1 up 2 right 3 left
    if (dir==0){
      this.vy = this.vy + mag;
    }else if (dir==1){
      this.vy = this.vy - mag;
    }else if (dir==2){
      this.vx = this.vx + mag;
    }else if (dir==3){
      this.vx = this.vx - mag;
    }else {console.log("bad direction"+dir);}
  }
  collide(checkedsprite){  //Checks if this overlaps checkedsprite
    var dx = checkedsprite.x - this.x; //x position difference
    var dy = checkedsprite.y - this.y; //y position difference
    var meansize = (checkedsprite.s + this.s)/2;  //total size
    if (((dx < meansize) && (dx > -1*meansize )) && ((dy < meansize) && (dy > -1*meansize ))){
        return true; 
        } else {return false;}
  }
  match(that){
    this.x=that.x;
    this.y=that.y;
    this.vx=that.vx;
    this.vy=that.vy;
  }
  kill(){
    this.x=-100;  //Resets position (usually offscreen)
    this.y=-100;
    this.vx = 0;         //resets velocity
    this.vy = 0;
  }
  
  randomize(xmax, ymax, vmax){ //This function randomizes location and velocity.
    this.x = this.s/2+Math.random()*(xmax - this.s/2); //Size is taken into account so items are
    this.y = this.s/2+Math.random()*(ymax - this.s/2); //not spawned partly out of bounds.
    this.vx = 2*(Math.random()*(vmax) - vmax/2); //Negative numbers are negative direction.
    this.vy = 2*(Math.random()*(vmax) - vmax/2);
  }
  
  boundarybounce(xmax, ymax){ //Bounces off walls of rectangle from 0,0 to xmax, ymax
    if ((this.x < this.s/2) || (this.x > xmax-this.s/2)){
      this.vx = -1*this.vx; //X wall collision for sprite
      return 1;
    }else if ((this.y < this.s/2) || (this.y > ymax-this.s/2)){
      this.vy = -1*this.vy;  //Y wall collision for sprite
      return 1;
    } else {return 0;}
  }
  boundarykill(xmax, ymax){ //Bounces off walls of rectangle from 0,0 to xmax, ymax
    if ((this.x < this.s/2) || (this.x > xmax-this.s/2)){
    this.kill();			//X wall collision for sprite
    return 1;
    }else if ((this.y < this.s/2) || (this.y > ymax-this.s/2)){
    this.kill();			//Y wall collision for sprite
    return 1;
    } else {return 0;}
  }
}

class User{
  constructor(name,id){
    this.name = name;
    this.id = id;
    this.s = new Sprite(-100,-100,32,"tan");//constructor(xxx, yyy, sss, ccc) {
    this.bs = new Sprite(-100,-100,20,"magenta");// this.s is player sprite, this.bs is bomb sprite
    //this.es = new Sprite(-100,-100,32,"orange");// this.es is the bomb explosion
    this.input = -1;
    this.score = 100;
  }
}
class Userlist{
  constructor(users){
    this.users = users;
  }
  getname(userid){
    var i=0;
    var username = "Not found";
    while (i<this.users.length){
      if (this.users[i].id == userid){
        username = this.users[i].name;
        i = this.users.length;
      }
      i++;
    }
    return username;
  }
  setname(newname,userid){//needs failsafe
    var i=0;
    var success = false;
    while (i<this.users.length){
      if (this.users[i].id == userid){
        this.users[i].name = newname;
        i = this.users.length;
        success = true;
      }
      i++;
    }
    return success;
  }
  getcolor(userid){
    var i=0;
    var usercolor = "tan";
    while (i<this.users.length){
      if (this.users[i].id == userid){
        usercolor = this.users[i].s.c;
        i = this.users.length;
      }
      i++;
    }
    return usercolor;
  }
  setcolor(newcolor,userid){//needs failsafe
    var i=0;
    while (i<this.users.length){
      if (this.users[i].id == userid){
        this.users[i].s.c = newcolor;
        i = this.users.length;
      }
      i++;
    }
  }
  setinput(newinput,userid){//needs failsafe
    var i=0;
    while (i<this.users.length){
      if (this.users[i].id == userid){
        this.users[i].input = newinput;
        i = this.users.length;
      }
      i++;
    }
  }
  getindex(userid){
    var i=0;
    var userindex = "-1";//Deliberate error to make problem visible on function failure
    while (i<this.users.length){
      if (this.users[i].id == userid){
        userindex = i;
        i = this.users.length;
      }
      i++;
    }
    return userindex;
  }
}
var allusers = new Userlist([]);
var bling = new Sprite(0,0,48,"grey")
bling.randomize(xsize, ysize, 3);//This function randomizes location and velocity.
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

//io.on('connection', (socket) => {//chat messaging
//    socket.on('chat message', (msg) => {
//      var theid = socket.id;
//      io.emit('chat message', allusers.getname(theid)+": "+msg);
//    });
// });

//io.on('connection', (socket) => { //name changing
//  socket.on('namechange', (newname) => {
//    var theid = socket.id;
//    var theusername = allusers.getname(theid);
//    var found = allusers.setname(newname,theid);
//    console.log("name change "+found);
//    io.emit('chat message', theusername+" changed name to "+allusers.getname(theid));
//  });
//});

io.on('connection', (socket) => { //Player input
  socket.on('gameinput', (input) => {
    var theid = socket.id;
    allusers.setinput(input,theid);
  });
});

io.on('connection', (socket) => { //Fresh connection and disconnection
    //console.log('a user connected');
    var theid = socket.id;
    var newuser = new User("Cactus Fantastico",theid);
    var randomplayercolor = playercolors[Math.floor(Math.random()*playercolors.length)];
    allusers.users.push(newuser);
    allusers.setcolor(randomplayercolor,theid);
    io.to(theid).emit('whoami', randomplayercolor);
    allusers.users[allusers.users.length-1].s.x = xsize/2+Math.floor(Math.random()*9)-4;
    allusers.users[allusers.users.length-1].s.y = ysize/2+Math.floor(Math.random()*9)-4;
    console.log(allusers);
    socket.on('disconnect', () => {
        //io.emit('chat message', allusers.getname(theid)+" has disconnected");
        allusers.users.splice(allusers.getindex(theid), 1);//remove defunct users here
     });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

const FPS = 30;
setInterval(update, 1000 / FPS);    		// set up interval (game loop)

function update() { //game loop
  var updateplayerarray = [];
  var updatebombarray = [];
  var updatescorearray = [];
  var updateblingarray = []
  ///handling bomb explosings
  var i=0;
  while(i<allusers.users.length){//For all players...
    if(allusers.users[i].bs.c=="orange"){//If bomb is in explosion state
      if (allusers.users[i].bs.s==96){//If bomb is in stage 1 of explosion...
        allusers.users[i].bs.s=128;//make boom even bigger
      }else{//otherwise, (if the bomb is in stage 2)
        allusers.users[i].bs.s=20; //reset bomb size
        allusers.users[i].bs.c="magenta";//and color
        allusers.users[i].bs.x=-100;//hide out of bounds
        allusers.users[i].bs.y=-100;
        allusers.users[i].bs.vx=0;//and stop
        allusers.users[i].bs.vy=0;
      }
    }
    //handling player input (movement and bomb launch/detonation)
    if (allusers.users[i].input>=0 && allusers.users[i].input<4){//If player has pressed an arrow
      allusers.users[i].s.shove(allusers.users[i].input,2);//push the sprite
    }else if (allusers.users[i].input==4){//if the player hit spacebar
      if (allusers.users[i].bs.x<0){
        allusers.users[i].bs.match(allusers.users[i].s);
      }else {
        allusers.users[i].bs.s=96;//This enlarges (explodes) bomb
        allusers.users[i].bs.c="orange";
      }
    }
    //safe zone
    var safe = false;
    if (allusers.users[i].s.x<xsize/2+safex/2 && allusers.users[i].s.x>xsize/2-safex/2 &&
        allusers.users[i].s.y<ysize/2+safey/2 && allusers.users[i].s.y>ysize/2-safey/2){
         safe = true;
       }
    //bomb collision handling
    var j=0;
    while (j<allusers.users.length){//to all users (including self)
      if (allusers.users[i].s.collide(allusers.users[j].bs)&&!safe){//if bomb is touching player
          if (allusers.users[j].bs.c=="orange"&&allusers.users[j].bs.x>0){//if bomb is exploding and in-bounds
            allusers.users[i].s.x = xsize/2+Math.floor(Math.random()*9)-4;//reset position
            allusers.users[i].s.y = ysize/2+Math.floor(Math.random()*9)-4;
            allusers.users[i].s.vx = 0;//stop player movement
            allusers.users[i].s.vy = 0;
            allusers.users[i].score--;
            //do more stuff, maybe do a timeout
          }
        }
      j++
      }
    if (bling.collide(allusers.users[i].bs)&&!safe){//if bomb is touching player
      if (allusers.users[i].bs.c=="orange"&&allusers.users[i].bs.x>0){//if bomb is exploding and in-bounds
        bling.randomize(xsize, ysize, 3); //This function randomizes location and velocity.
        allusers.users[i].score=allusers.users[i].score+2;
        //do more stuff, maybe do a timeout
        } 
      } 
    allusers.users[i].input = -1;//reset input to null value (0 is down arrow)
    allusers.users[i].s.boundarybounce(xsize, ysize);//Bounces off walls of rectangle
    allusers.users[i].bs.boundarybounce(xsize, ysize);//Bounces off walls of rectangle

    allusers.users[i].s.update1(); //basic motion update
    allusers.users[i].bs.update1();
    updateplayerarray.push([allusers.users[i].s.x,allusers.users[i].s.y,allusers.users[i].s.c]);
    updatebombarray.push([allusers.users[i].bs.x,allusers.users[i].bs.y,allusers.users[i].bs.c,allusers.users[i].bs.s]);
    updatescorearray.push([allusers.users[i].score,allusers.users[i].s.c]);//score and color
    i++;
  }
  bling.boundarybounce(xsize,ysize);
  bling.update1();
  
  updateblingarray.push([bling.x,bling.y]);//score and color
  io.emit('gameupdate', [updateplayerarray,updatebombarray,updatescorearray,updateblingarray]);

}