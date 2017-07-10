
var colorBlue = "#0000ff";
var colorRed = "#ff0000";
var colorBlack = "#000000";
var curColor=colorBlack;
var restorePoints = [];

document.addEventListener("DOMContentLoaded", function() {
   var mouse = { 
      click: false,
      move: false,
      pos: {x:0, y:0},
      pos_prev: false
   };
   // get canvas element and create context
   var canvas  = document.getElementById('drawing');
   var context = canvas.getContext('2d');
   var width   = window.innerWidth;
   var height  = window.innerHeight;
   //take pic of previous screen
   var imgSrc = canvas.toDataURL("image/png");
   restorePoints.push(imgSrc);
   var socket  = io.connect();

   // set canvas to full browser width/height
   canvas.width = width;
   canvas.height = height;
   //made the cursor as crosswire
   canvas.style.cursor="crosshair";

   // register mouse event handlers
   canvas.onmousedown = function(e){ 
      mouse.click = true; };

   canvas.onmouseup = function(e){
      socket.emit('draw_line', { line: null, color : null});
      mouse.click = false;
   };

   canvas.onmousemove = function(e) {
      // normalize mouse position to range 0.0 - 1.0
      mouse.pos.x = e.clientX / width;
      mouse.pos.y = e.clientY / height;
      mouse.move = true;
   };

   // draw line received from server
	socket.on('draw_line', function (data) {
	if(data.line!= null && data.color!= null){
      var line = data.line;
      data.line.strokeStyle=data.color;
      data.line.lineWidth=5;
      context.beginPath();
      context.moveTo(line[0].x * width, line[0].y * height);
      context.lineTo(line[1].x * width, line[1].y * height);
      context.strokeStyle = data.color;
      context.lineWidth = 5;
      context.stroke();  
	}	  
   });

   // main loop, running every 25ms
   function mainLoop() {
      // check if the user is drawing
      if (mouse.click && mouse.move && mouse.pos_prev) {
         // send line to to the server
         socket.emit('draw_line', { line: [ mouse.pos, mouse.pos_prev] , color : curColor});       
         mouse.move = false;
      }
      mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};
      setTimeout(mainLoop, 25);
   }

   //select red color when button clicked
   $('#red').get(0).addEventListener('click', function(e) {
         curColor=colorRed;         
         buttonstyle(document.getElementById('red'),"black","double","15");        
         buttonstyle(document.getElementById('blue'),"none","none");             
      }, false);


   //select green color when button clicked
   $('#blue').get(0).addEventListener('click', function(e) {
         curColor=colorBlue;
         buttonstyle(document.getElementById('blue'),"black","double","15");
         buttonstyle(document.getElementById('red'),"none","none");       
      }, false);

   //fires when button undo is clicked
   $('#undo').get(0).addEventListener('click', function(e) {
      //inform server undo was hit
      socket.emit('undo_called_client',{});
   }, false);

   //listen to undo from server 
   socket.on('undo_called_server',function(data){
      //clear the canvas 
      context.clearRect(0, 0, canvas.width, canvas.height);
   })
      

   //set the selected style to the button 
   function buttonstyle(element,color,style,width){
            element.style.borderStyle = style;
            element.style.borderWidth=width;
            element.style.borderColor=color;
   }

   mainLoop();
});