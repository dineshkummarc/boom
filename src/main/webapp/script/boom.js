
//(function($){


// Perform login: Ask user for name, and send message to socket.
//function login() {
//    var defaultUsername = (window.localStorage && window.localStorage.username) || 'yourname';
//    var username = prompt('Choose a username', defaultUsername);
//    if (username) {
//        if (window.localStorage) { // store in browser localStorage, so we remember next next
//            window.localStorage.username = username;
//        }
//        send({action:'LOGIN', loginUsername:username});
//        document.getElementById('entry').focus();
//    } else {
//        ws.close();
//    }
//}

var gameObjects = [];

var wizardAABB = [
    {"maxY":154,"maxX":95,"minX":23,"minY":15},{"maxY":154,"maxX":98,"minX":22,"minY":22},{"maxY":153,"maxX":95,"minX":26,"minY":15},
    {"maxY":154,"maxX":93,"minX":27,"minY":10},{"maxY":154,"maxX":96,"minX":26,"minY":13},{"maxY":154,"maxX":98,"minX":25,"minY":19},
    {"maxY":153,"maxX":95,"minX":26,"minY":11},{"maxY":154,"maxX":96,"minX":26,"minY":8},{"maxY":157,"maxX":95,"minX":19,"minY":18},
    {"maxY":157,"maxX":98,"minX":14,"minY":25},{"maxY":156,"maxX":95,"minX":22,"minY":18},{"maxY":157,"maxX":93,"minX":19,"minY":13},
    {"maxY":157,"maxX":96,"minX":18,"minY":15},{"maxY":157,"maxX":98,"minX":16,"minY":21},{"maxY":156,"maxX":95,"minX":22,"minY":15},
    {"maxY":157,"maxX":96,"minX":19,"minY":11},{"maxY":160,"maxX":95,"minX":24,"minY":30},{"maxY":160,"maxX":98,"minX":27,"minY":36},
    {"maxY":159,"maxX":95,"minX":26,"minY":25},{"maxY":160,"maxX":93,"minX":26,"minY":19},{"maxY":160,"maxX":96,"minX":26,"minY":30},
    {"maxY":160,"maxX":98,"minX":27,"minY":36},{"maxY":159,"maxX":95,"minX":26,"minY":25},{"maxY":160,"maxX":96,"minX":27,"minY":19},
    {"maxY":163,"maxX":95,"minX":29,"minY":36},{"maxY":163,"maxX":98,"minX":30,"minY":42},{"maxY":162,"maxX":95,"minX":30,"minY":32},
    {"maxY":163,"maxX":93,"minX":29,"minY":26},{"maxY":163,"maxX":96,"minX":28,"minY":36},{"maxY":163,"maxX":98,"minX":29,"minY":42},
    {"maxY":162,"maxX":95,"minX":29,"minY":32},{"maxY":163,"maxX":96,"minX":30,"minY":26}];

var TILES_PER_ROW = 21;
var TILE_ROWS = 19;

var YSTEP = 79; 

var level = [];

for (var i=0, len = TILES_PER_ROW * TILE_ROWS; i < len ; i++)
{
    level[i] = 0;
}

var heightMap = [];
var shadowsMap = [];
var levelImageData = null;
var copy = null;
var tmp = null;

var spellFrames;


var ws;
var canvas,ctx, width, height,yStep,yCorrect;

var player;

function tileOffset(x,y)
{
    return y * TILES_PER_ROW + x;
}

function getShadowTilesAt(x,y)
{
    var l = [];
    
    var off = tileOffset(x, y);
    
    var hTopLeft = 0;
    var hLeft = 0;
    var hBottomLeft = 0;
    var hTopRight = 0;
    var hRight = 0;
    var hBottomRight = 0;
    
    var hMid = heightMap[off];
    var hTop    = y > 0  ? heightMap[off - TILES_PER_ROW] : 0;
    var hBottom = y < 15 ? heightMap[off + TILES_PER_ROW] : 0;
    
    if (x > 0)
    {
        hTopLeft    =  y >  0 ? heightMap[off - TILES_PER_ROW - 1] : 0;
        hBottomLeft =  y < 15 ? heightMap[off + TILES_PER_ROW - 1] : 0;
        hLeft = heightMap[off - 1];
    }

    if (x < 15)
    {
        hTopRight    =  y >  0 ? heightMap[ off - TILES_PER_ROW + 1] : 0;
        hBottomRight =  y < 15 ? heightMap[ off + TILES_PER_ROW + 1] : 0;
        hRight =  heightMap[off + 1];
    }
    
    if (hBottomRight > hMid && hRight < hMid)
    {
        l.push(BLOCK_SHADOW_SOUTH_EAST);
    }
    
    if (hBottom > hMid && hBottom == 2)
    {
        l.push(BLOCK_SHADOW_SOUTH);
    }
    
    if (hBottomLeft > hMid && hLeft < hMid)
    {
        l.push(BLOCK_SHADOW_SOUTH_WEST);
    }

    if (hRight > hMid)
    {
        l.push(BLOCK_SHADOW_EAST);
    }

    if (hLeft > hMid)
    {
        l.push(BLOCK_SHADOW_WEST);
    }
    
    if (hTopRight > hMid && hTop <= hMid && hRight <= hMid)
    {
        l.push(BLOCK_SHADOW_NORTH_EAST);
    }
    
    if (hTop > hMid)
    {
        l.push(BLOCK_SHADOW_NORTH);
    }

    if (hTopLeft > hMid && hTop <= hMid && hLeft <= hMid)
    {
        l.push(BLOCK_SHADOW_NORTH_WEST);
    }
    
    if (hBottomLeft == hMid && hBottom < hMid)
    {
        l.push(BLOCK_SHADOW_SIDE_WEST);
    }
    
    //console.debug("shadows for %d,%d = %o", x,y, l);
    
    return l;
}


function blockHeight(block)
{
    if (block == BLOCK_EMPTY || block == BLOCK_ROCK || block == BLOCK_TREE_UGLY  || block == BLOCK_TREE_SHORT || block == BLOCK_TREE_TALL || block == BLOCK_PAD)
    {
        return 0;
    }
    else if (block  == BLOCK_STONE_BLOCK_TALL || block == BLOCK_WALL_BLOCK_TALL || block == BLOCK_WINDOW_TALL)
    {
        return 2;
    }
    else 
    {
        return 1;
    }
}

    

function setBlock(x,y,block)
{
    var off = tileOffset(x,y);
    level[off] = block || BLOCK_EMPTY;
    
    heightMap[off] = blockHeight(block);
}

function gap(opt)
{
    return opt ? Math.random() < 0.9 : true;
}

function obstacle()
{
    var v = Math.random();
    if (v < 0.333)
    {
        return BLOCK_ROCK;
    }
    else if (v < 0.666)
    {
        return BLOCK_TREE_TALL;
    }
    else 
    {
        return BLOCK_TREE_SHORT;
    }
    
}

function drawSquare(sx ,sy, w, h, block, randomGap)
{
    var ex = sx + w - 1;
    var ey = sy + h - 1;
    
    var g1x = -1;
    var g2x = -1;
    var g1y = -1;
    var g2y = -1;
    
    if (randomGap)
    {
        g1x = sx + Math.floor(Math.random() * ( ex - sx ));
        g2x = sx + Math.floor(Math.random() * ( ex - sx ));
        g1y = sy + Math.floor(Math.random() * ( ey - sy ));
        g2y = sy + Math.floor(Math.random() * ( ey - sy ));
    }

    
    for (var x = sx; x <= ex; x++)
    {
        if (x != g1x)
        {
            setBlock(x, sy,block);
        }
        else
        {
            if (Math.random() > 0.5)
            {
                setBlock(x, sy, obstacle());
            }
        }
        
        if (x != g2x)
        {
            setBlock(x, ey,block);
        }
        else
        {
            if (Math.random() > 0.5)
            {
                setBlock(x, ey, obstacle());
            }
        }
    }

    for (var y = sy; y <= ey; y++)
    {
        if (y != g1y)
        {
            setBlock(sx, y,block);
        }
        else
        {
            if (Math.random() > 0.5)
            {
                setBlock(sx, y, obstacle());
            }
        }
        if (y != g1y)
        {
            setBlock(ex, y,block);
        }
        else
        {
            if (Math.random() > 0.5)
            {
                setBlock(ex, y, obstacle());
            }
        }
    }
}


function drawBlocks(tileX,tileY, x,y)
{
    if (tileX < 0 || tileY < 0)
    {
        return;
    }
    
    var off = tileOffset(tileX, tileY);
    var block = level[off];
    
    if (block != null)
    {
        backgroundSet.draw(ctx,block,x,y);
    }
    
    var shadows = shadowsMap[off];
    
    for (var i=0, len = shadows.length; i < len; i++)
    {
        var block = shadows[i];
        if (block != null)
        {
            backgroundSet.draw(ctx,block,x,y);
        }
    }
}

var backgroundSet = null;

var lastLoopTime;

function restorePlayer(player)
{
    var px = player.x;
    var py = player.y;
    var tileSet = player.tileSet;
    var tw = tileSet.tileWidth;
    var th = tileSet.tileHeight;
    
    if (py < 0)
    {
        th += py;
        py = 0;
    }

    if (px < 0)
    {
        tw -= px;
        px = 0;
    }
    
    ctx.drawImage(copy, px, py, tw, th, px, py, tw, th);
}

function validatePlayer(x,y,dx,dy) 
{
    var scale = backgroundSet.scale;
    var tw = backgroundSet.tileWidth;
    x += dx;
    y += dy;
    
    if (dx > 0)
    {
        x += 90 * scale;
    }
    else
    {
        x += 10 * scale;
    }
    
    var tileX = Math.floor(x / tw);
    var tileY = Math.floor((y + yCorrect)/ yStep) ;
    
    if (tileX < 0 || tileX >= TILES_PER_ROW || tileY < 0  || tileY >= TILE_ROWS)
    {
        return false;
    }
    
    var block = level[tileY * TILES_PER_ROW + tileX];
    return !block || block == BLOCK_PAD;
}


function onSpellIgnite(ev, gameObject)
{
    console.info("%o destroyed", gameObject);
    
    gameObjects.splice(gameObject.index,1);
}

this.Application = {
init:
    function()
    {
        var url = 'ws://boom.localhost:9876/appsocket';

        console.debug(url);
        ws = new WebSocket(url);
        ws.onopen = Application.onOpen;
        ws.onclose = Application.disconnected;
        ws.onerror = Application.onerror;
        ws.onmessage = Application.onMessage;

        var $canvas = $("#teh_canvas");
        canvas = $canvas[0];

        Spell.prototype.createFrames();
        
        $(document).bind("spellIgnite", onSpellIgnite);
        
        Loader.load(["../../image/sheet.png","../../image/wizard-anim.png"], Application.onLoad);
    },
onLoad:
    function(images)
    {
        var $window = $(window);
        
        var scaledToWidth = ($window.width() - 1) / (101 * TILES_PER_ROW);
        var scaledToHeight = ($window.height() - 38) / (YSTEP * (TILE_ROWS - 1) + 171);
        
        var scale = Math.min(scaledToWidth, scaledToHeight);
        
        Application.scale = scale;

        backgroundSet = new TileSet(images[0], 101, 171, scale);
        backgroundSet.emptyBlock = BLOCK_EMPTY;
        wizardSet = new TileSet(images[1], 101, 171, scale);
        wizardSet.aabb = wizardAABB;
        
        console.debug(backgroundSet);
        
        yStep = Math.floor(YSTEP * scale);
        
        Application.yStep = yStep;
        
        width = backgroundSet.tileWidth * TILES_PER_ROW;
        height = (yStep * (TILE_ROWS - 1)) + backgroundSet.tileHeight;
        
        var x = 0;
        var y = 0;
        var w = TILES_PER_ROW;
        var h = TILE_ROWS;
        
        do
        {
            drawSquare( x, y, w, h, x == 0 ? BLOCK_STONE_BLOCK_TALL : BLOCK_STONE_BLOCK , x > 0);
            x += 2;
            y += 2;
            w -= 4;
            h -= 4;
            
        } while ( w > 0 && h > 0 );
        
        
        var xmid = Math.floor(TILES_PER_ROW / 2) + 1;
        var ymid = Math.floor(TILE_ROWS / 2) + 1;
        var xmax = TILES_PER_ROW - 1;
        var ymax = TILE_ROWS - 1;
 
        setBlock(   0,    0, BLOCK_WALL_BLOCK_TALL); 
        setBlock(xmax,    0, BLOCK_WALL_BLOCK_TALL); 
//        setBlock(   0, ymax, BLOCK_WALL_BLOCK_TALL); 
//        setBlock(xmax, ymax, BLOCK_WALL_BLOCK_TALL);

        for (var i=1,len=TILES_PER_ROW - 1; i < len; i++)
        {
            setBlock(i, ymax, BLOCK_EMPTY);
        }
        
        setBlock(xmid,    0, BLOCK_PAD); 
        setBlock( xmid, ymax, BLOCK_PAD); 
        setBlock(    0, ymid, BLOCK_PAD);
        setBlock( xmax, ymid, BLOCK_PAD); 

        canvas.width = width;
        canvas.height = height;
        
        $("#container").width(width);

        for (var i=0, len = TILE_ROWS * TILES_PER_ROW; i < len; i++)
        {
            heightMap[i] = heightMap[i] || 0;
        }
        
        for (var y=0; y < TILE_ROWS; y++)
        {
            for (var x=0; x < TILES_PER_ROW; x++)
            {
                shadowsMap[tileOffset(x,y)] = getShadowTilesAt(x,y);
            }
        }
        
        player = new Player(new KeyBasedControl({
            CONTROL_ATTACK : 32, 
            CONTROL_UP : 38, 
            CONTROL_DOWN : 40, 
            CONTROL_LEFT : 37, 
            CONTROL_RIGHT : 39  
        }), wizardSet, 0,0);
        
        player.x = backgroundSet.tileWidth;
        player.y = yStep;

        var tileSet = player.tileSet;
        yCorrect = Math.floor((YSTEP/2) * tileSet.scale);
        
        ctx = canvas.getContext('2d');
        ctx.fillStyle = "#aaa";
        ctx.fillRect(0,0, width, height);
        var yPos=0,xPos;
        
        for (var y=0; y < TILE_ROWS; y++)
        {
            xPos =0;
            for (var x=0; x < TILES_PER_ROW; x++)
            {
                drawBlocks(x,y, xPos, yPos);
                xPos += backgroundSet.tileWidth;
            }
            yPos += yStep;
        }
        
        copy = document.createElement("canvas");
        copy.width = canvas.width;
        copy.height = canvas.height;
        
        tmp = document.createElement("canvas");
        tmp.width = backgroundSet.tileWidth; 
        tmp.height = backgroundSet.tileHeight; 
        
        var copyCtx = copy.getContext('2d');
        copyCtx.drawImage(canvas,0,0); 
        
        lastLoopTime = new Date().getTime() - 1;
        Application.mainLoop();
    },
register:
    function(gameObject)
    {
        gameObject.index = gameObjects.length;
        gameObjects.push(gameObject);
        
    },
mainLoop:
    function()
    {
        var now = new Date().getTime();
        var delta = now - lastLoopTime;
        lastLoopTime = now;
        
        restorePlayer(player);

        for (var i=0, len = gameObjects.length; i < len; i++)
        {
            var go = gameObjects[i]; 
            go.draw(ctx,delta);
        }
        
        var tw = backgroundSet.tileWidth;
        var th = backgroundSet.tileHeight;
        
        player.move(delta, validatePlayer);

        var tileX = Math.floor(player.x / tw);
        var tileY = Math.floor((player.y + yCorrect)/ yStep) + 1 ;
        
        var tmpCtx = tmp.getContext("2d");
        tmpCtx.clearRect(0,0, tw,th); 
        
        tmpCtx.globalCompositeOperation = "source-over";
        player.draw(tmpCtx);
        tmpCtx.globalCompositeOperation = "destination-out";
        
        var block = level[tileY * TILES_PER_ROW + tileX];
        var offsetX = Math.round(player.x - (tileX * tw)); 
        var offsetY = Math.round(player.y - (tileY * yStep)); 
        backgroundSet.draw(tmpCtx, block, -offsetX, -offsetY);

        if (tileX < TILES_PER_ROW - 1)
        {
            var block = level[tileY * TILES_PER_ROW + tileX + 1];
            backgroundSet.draw(tmpCtx, block, -offsetX + tw, -offsetY);
        }
           
        
        ctx.drawImage(tmp, player.x, player.y);
        
        window.setTimeout( Application.mainLoop, 20);
    },
onOpen:
    function()
    {
        console.info("connected");
        send({"type":"Login"});
    },
onClose:
    function()
    {
        console.info("disconnected");
    },
onError:
    function()
    {
        console.error(e);
    },
onMessage:
    function(e)
    {
        var data = JSON.parse(e.data);
        console.debug("message: %o", data);
    }
};

// Send message to server over socket.
function send(outgoing) {
    ws.send(JSON.stringify(outgoing));
}

$(this.Application.init);
 

//})(jQuery);
