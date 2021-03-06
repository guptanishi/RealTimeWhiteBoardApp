var express = require('express'), 
    app = express(),
    http = require('http'),
    socketIo = require('socket.io'),
	mustache = require('mustache'),
	engines = require('consolidate');


var fs = require('fs');
var shortid = require('shortid');

app.set('views', __dirname + '/public');
app.engine('html', engines.mustache);
app.set('view engine', 'html');

// start webserver on port 8081
var server =  http.createServer(app);
var io = socketIo.listen(server);
server.listen(8081); 


// add directory with our static files
var array = [];
app.use(express.static(__dirname + '/public'));
console.log("Server running on 127.0.0.1:8081");


 app.get('/share/:id', function (req, res, next) {
     fs.readFile('abc.txt', function (err, data) {
      if (err) throw err;
      if(data.indexOf(req.params.id) >= 0){
         res.redirect('/share');
      }else{
        res.redirect('/404');
      }
    });
   });
   
 app.get('/share',function(req,res,next){
     res.render('index.html');
 })
 
 app.get('/404',function(req,res,next){
   res.render('404.html',  { title: 'Hey', message: 'Hello there!' });
 });


//creates URL for sharing
app.post('/createUrl',function(req,res){
    //req.ip=myIP;
    var tempD=shortid.generate();
    fs.appendFile('abc.txt', tempD+"\n", function (err) {
    if (err) throw err;
    res.send(req.protocol + '://' + req.get('host') +'/share/'+tempD);
  });


});
// array of all lines drawn
var line_history = [];

// event-handler for new incoming connections
io.on('connection', function (socket) {

   // first send the history to the new client
   for (var i in line_history) {
      socket.emit('draw_line', { line: line_history[i].line, color:line_history[i].color, clientid:line_history[i].clientid} );
   }

   // add handler for message type "draw_line".
   socket.on('draw_line', function (data) {
      // add received line to history 
      line_history.push(data);
      // send line to all clients
      io.emit('draw_line', { line: data.line , color : data.color, clientid: data.clientid });
   });

    //listens to the undo click from client 
    socket.on('undo_called_client',function(data)
    {     
        var isRedrawNeeded=false;
        //remove the line from the line history
        if(line_history.length>0)
        {
            if(line_history[line_history.length-1].line==null && 
            line_history[line_history.length-1].clientid.valueOf()===data.clientid.valueOf())
            {            
                line_history.pop(); //pop-out the last null dummy element sent 
            }
            
            for(var i=line_history.length-1; i>0; i--)
            {
                if(line_history[i].line!=null && 
                line_history[i].clientid.valueOf()===data.clientid.valueOf() )
                {
                    var index = line_history.indexOf(line_history[i]);
                    if (index > -1) 
                    {
                        line_history.splice(index, 1);
                    }
                    if(line_history[i-1].line==null)
                    {
                        break;
                    }
                    isRedrawNeeded=true;
                }
            }
            if(isRedrawNeeded){
                //call refresh canvas on all the clients
                io.emit('undo_called_server',{});
                //redraw the lines on canvas using the history
                for (var i in line_history) 
                {
                    io.emit('draw_line', { line: line_history[i].line ,color : line_history[i].color,clientid:line_history[i].clientid});
                }
            }
        }

    });

});
