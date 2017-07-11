var express = require('express'),
    app = express(),
    http = require('http'),
    socketIo = require('socket.io'),
    mustache = require('mustache'),
    engines = require('consolidate');

var fs = require('fs');
var shortid = require('shortid');
var session = require('client-sessions');
app.set('views', __dirname + '/public');
app.engine('html', engines.mustache);
app.set('view engine', 'html');

app.use(session({
    cookieName: 'mySession',
    secret: 'sklfdjlskdjlkj',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
}));
// start webserver on port 8081
var server = http.createServer(app);
var io = socketIo.listen(server);
server.listen(8081);

// add directory with our static files
var array = [];
app.use(express.static(__dirname + '/public'));
console.log("Server running on 127.0.0.1:8081");

// array of all lines drawn
var line_history = [];
var url_list = [];
var roomno = 0;
line_history.push([]);
var mIndex=0;
app.get('/share/:id', function (req, res, next) {
    var flag = 0;
    if (req.params.id != '') {

        for (var i = 0; i < url_list.length; i++) {
            if (url_list[i][0] == req.params.id) {

                roomno = url_list[i][1];
                flag = 1;
                break;

            }
        }
    }
    if (flag)
        res.redirect('/share');
    else
        res.redirect('/404');
});

app.get('/share', function (req, res, next) {
    if (!req.mySession.user) {
        req.mySession.user = shortid.generate();
    }
    res.render('index1.html');
})
app.get('/', function (req, res, next) {
    if ((!req.mySession.user)||(url_list.length==0 && req.mySession.user && req.mySession)) {
        req.mySession.reset();
        req.mySession.user = shortid.generate();

        line_history.push([]);
        roomno = mIndex;
        mIndex++;
        url_list.push(['', roomno, req.mySession.user]);
    } else {

        var flag=0;
        for (var i = 0; i < url_list.length; i++) {
            if (url_list[i][2] == req.mySession.user) {
                roomno = url_list[i][1];
                flag=1;
                break;
            }
        }
        if(!flag){
            req.mySession.user = shortid.generate();

            line_history.push([]);
            roomno = mIndex;
            mIndex++;
            url_list.push(['', roomno, req.mySession.user]);
        }
    }
    res.render('index1.html');
})

app.get('/404', function (req, res, next) {
    res.render('404.html', {title: 'Hey', message: 'Hello there!'});
});

//creates URL for sharing
app.post('/createUrl', function (req, res) {
    for (var i = 0; i < url_list.length; i++) {
        if (url_list[i][2] == req.mySession.user) {
            roomno = url_list[i][1];
            var tempD = shortid.generate();
            url_list.push([tempD, roomno, req.mySession.user]);
            res.send(req.protocol + '://' + req.get('host') + '/share/' + tempD);
            break;
        }
    }
});

// event-handler for new incoming connections
io.on('connection', function (socket) {

    socket.room = roomno;
    socket.join(socket.room);
    // first send the history to the new client
    for (var i in line_history[socket.room]) {
        io.sockets.in(socket.room).emit('draw_line', {
            line: line_history[socket.room][i].line,
            color: line_history[socket.room][i].color,
            clientid:line_history[socket.room][i].clientid
        });
    }

    // add handler for message type "draw_line".
    socket.on('draw_line', function (data) {
        // add received line to history
        line_history[socket.room].push(data);
        // send line to all clients
        io.sockets.in(socket.room).emit('draw_line', {line: data.line, color: data.color,clientid: data.clientid});
    });


    //listens to the undo click from client
    socket.on('undo_called_client',function(data)
    {
        var isRedrawNeeded=false;
        //remove the line from the line history
        if(line_history.length>0)
        {
            console.log(line_history[socket.room][line_history.length-1].line);
            if(line_history[socket.room][line_history.length-1].line==null &&
                line_history[socket.room][line_history[socket.room].length-1].clientid.valueOf()===data.clientid.valueOf())
            {
                line_history[socket.room].pop(); //pop-out the last null dummy element sent
            }

            for(var i=line_history[socket.room].length-1; i>0; i--)
            {
                if(line_history[socket.room][i].line!=null &&
                    line_history[socket.room][i].clientid.valueOf()===data.clientid.valueOf() )
                {
                    var index = line_history[socket.room].indexOf(line_history[i]);
                    if (index > -1)
                    {
                        line_history[socket.room].splice(index, 1);
                    }
                    if(line_history[socket.room][i-1].line==null)
                    {
                        break;
                    }
                    isRedrawNeeded=true;
                }
            }
            if(isRedrawNeeded){
                //call refresh canvas on all the clients
                io.sockets.in(socket.room).emit('undo_called_server',{});
                //redraw the lines on canvas using the history
                for (var i in line_history)
                {
                    io.sockets.in(socket.room).emit('draw_line', { line: line_history[socket.room][i].line ,color : line_history[socket.room][i].color,clientid:line_history[socket.room][i].clientid});
                }
            }
        }

    });
	
	 //listens to the undo click from client 
    // socket.on('undo_called_client', function (data) {
    //     console.log(line_history.length);
    //
    //     //remove the line from the line history
    //     if (line_history.length > 0) {
    //         line_history[socket.room].pop();  //pop-out the last null dummy element sent
    //         for (var i = line_history[socket.room].length - 1; i >= 0; i--) {
    //             if (line_history[socket.room][i].line != null) {
    //                 line_history[socket.room].pop();
    //             }
    //             else
    //                 break;
    //         }
    //         //call refresh canvas on all the clients
    //         io.emit('undo_called_server', {});
    //         //redraw the lines on canvas using the history
    //         for (var i in line_history[socket.room]) {
    //             io.sockets.in(socket.room).emit('draw_line', {
    //                 line: line_history[socket.room][i].line,
    //                 color: line_history[socket.room][i].color
    //             });
    //         }
    //     }
    // });
});
