package com.masteriptv.player

import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

private val Navy = Color(0xFF080F1B)
private val Panel = Color(0xFF111D2D)
private val Blue = Color(0xFF2799E8)
private val Cyan = Color(0xFF4AD3E5)
private val Muted = Color(0xFF9AAEC4)

data class Channel(val name:String,val url:String,val group:String="Todos",val logo:String?=null)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MasterPlayerApp() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MasterPlayerApp() {
    val context= LocalContext.current
    val scope= rememberCoroutineScope()
    var channels by remember { mutableStateOf(listOf<Channel>()) }
    var selected by remember { mutableStateOf<Channel?>(null) }
    var page by remember { mutableStateOf("Inicio") }
    var query by remember { mutableStateOf("") }
    var sourceUrl by remember { mutableStateOf("") }
    var xtreamServer by remember { mutableStateOf("") }
    var xtreamUser by remember { mutableStateOf("") }
    var xtreamPass by remember { mutableStateOf("") }
    var pairingCode by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("Agrega una lista M3U o conecta Xtream Codes para comenzar.") }
    var group by remember { mutableStateOf("Todos") }
    val player= remember { ExoPlayer.Builder(context).build() }

    fun play(channel:Channel){selected=channel;player.setMediaItem(MediaItem.fromUri(channel.url));player.prepare();player.playWhenReady=true}
    DisposableEffect(Unit){onDispose{player.release()}}

    val filePicker= rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()){uri->
        if(uri!=null){
            scope.launch{
                busy=true
                try{
                    val text=withContext(Dispatchers.IO){context.contentResolver.openInputStream(uri)?.bufferedReader()?.use{it.readText()}?:error("No se pudo abrir el archivo")}
                    val parsed=parseM3u(text)
                    channels=parsed
                    message="Lista cargada: ${parsed.size} elementos."
                    context.openFileOutput("master_playlist.m3u",0).use{it.write(text.toByteArray())}
                }catch(e:Exception){message=e.message?:"Error al leer la lista"}
                busy=false
            }
        }
    }

    LaunchedEffect(Unit){
        val saved=withContext(Dispatchers.IO){runCatching{context.openFileInput("master_playlist.m3u").bufferedReader().use{it.readText()}}.getOrNull()}
        if(!saved.isNullOrBlank()){channels=parseM3u(saved);message="Lista restaurada: ${channels.size} elementos."}
    }

    val visible=channels.filter{(group=="Todos"||it.group==group)&&it.name.contains(query,true)}

    MaterialTheme(colorScheme=darkColorScheme(primary=Blue,background=Navy,surface=Panel,onBackground=Color.White,onSurface=Color.White)){
        Scaffold(containerColor=Navy,bottomBar={
            NavigationBar(containerColor=Panel,contentColor=Color.White){
                listOf("Inicio","Canales","Conectar").forEach{item->
                    NavigationBarItem(selected=page==item,onClick={page=item},icon={Icon(if(item=="Conectar")Icons.Default.Settings else Icons.Default.LiveTv,contentDescription=item)},label={Text(item)},colors=NavigationBarItemDefaults.colors(selectedIconColor=Cyan,selectedTextColor=Cyan,indicatorColor=Blue.copy(alpha=.18f),unselectedIconColor=Muted,unselectedTextColor=Muted))
                }
            }
        }){padding->
            Column(Modifier.fillMaxSize().padding(padding).background(Navy)){
                Row(Modifier.fillMaxWidth().padding(horizontal=20.dp, vertical=14.dp),verticalAlignment=Alignment.CenterVertically){
                    Box(Modifier.size(42.dp).background(Blue,RoundedCornerShape(13.dp)),contentAlignment=Alignment.Center){Text("M",fontSize=24.sp,fontWeight=FontWeight.Black,color=Color.White)}
                    Spacer(Modifier.width(12.dp))
                    Column{Text("MASTER",fontWeight=FontWeight.ExtraBold,letterSpacing=2.sp,fontSize=17.sp);Text("IPTV PLAYER",fontSize=9.sp,letterSpacing=2.sp,color=Cyan)}
                    Spacer(Modifier.weight(1f))
                    Text(if(channels.isEmpty())"SIN LISTA" else "${channels.size} ELEMENTOS",fontSize=9.sp,color=Muted)
                }

                if(selected!=null){
                    AndroidView(factory={PlayerView(it).apply{this.player=player;useController=true}},modifier=Modifier.fillMaxWidth().height(220.dp).background(Color.Black))
                    Row(Modifier.fillMaxWidth().padding(horizontal=18.dp,vertical=8.dp),verticalAlignment=Alignment.CenterVertically){
                        Column(Modifier.weight(1f)){Text(selected!!.name,fontWeight=FontWeight.Bold);Text(selected!!.group,color=Muted,fontSize=11.sp)}
                        TextButton(onClick={player.pause();selected=null}){Text("Cerrar")}
                    }
                }else{
                    Box(Modifier.fillMaxWidth().height(155.dp).padding(horizontal=16.dp).background(Panel,RoundedCornerShape(18.dp)),contentAlignment=Alignment.Center){
                        Column(horizontalAlignment=Alignment.CenterHorizontally){
                            Icon(Icons.Default.LiveTv,null,tint=Cyan,modifier=Modifier.size(38.dp))
                            Spacer(Modifier.height(8.dp))
                            Text("TU ENTRETENIMIENTO, SIN LÍMITES",fontSize=12.sp,fontWeight=FontWeight.Bold,letterSpacing=1.sp)
                            Text("Canales · Películas · Series",fontSize=11.sp,color=Muted)
                        }
                    }
                }

                when(page){
                    "Inicio"->Column(Modifier.fillMaxWidth().padding(18.dp)){
                        Text("Bienvenido",fontSize=23.sp,fontWeight=FontWeight.Bold)
                        Text(message,color=Muted,fontSize=12.sp,modifier=Modifier.padding(top=6.dp,bottom=18.dp))
                        Button(onClick={filePicker.launch(arrayOf("*/*"))},modifier=Modifier.fillMaxWidth(),colors=ButtonDefaults.buttonColors(containerColor=Blue)){Icon(Icons.Default.Add,null);Spacer(Modifier.width(8.dp));Text("Importar archivo M3U")}
                        OutlinedButton(onClick={page="Conectar"},modifier=Modifier.fillMaxWidth()){Text("Conectar enlace o Xtream")}
                        Spacer(Modifier.height(16.dp))
                        Text("RECIÉN AGREGADOS",fontSize=10.sp,color=Cyan,letterSpacing=1.4.sp,fontWeight=FontWeight.Bold)
                        channels.take(5).forEach{item->ChannelRow(item){play(item)}}
                    }
                    "Canales"->Column(Modifier.fillMaxSize().padding(horizontal=16.dp)){
                        OutlinedTextField(value=query,onValueChange={query=it},modifier=Modifier.fillMaxWidth(),singleLine=true,placeholder={Text("Buscar canales, películas o series")},leadingIcon={Icon(Icons.Default.Search,null)})
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment=Alignment.CenterVertically){Text("Categoría",fontSize=11.sp,color=Muted);Spacer(Modifier.width(10.dp));Text(group, color=Cyan,fontSize=12.sp)}
                        LazyColumn(Modifier.fillMaxSize()){
                            items(visible){item->ChannelRow(item){play(item)}}
                        }
                    }
                    "Conectar"->Column(Modifier.fillMaxSize().padding(18.dp)){
                        Text("Conectar contenido",fontSize=22.sp,fontWeight=FontWeight.Bold)
                        Text("Usa una URL M3U o tus datos Xtream Codes.",fontSize=12.sp,color=Muted,modifier=Modifier.padding(top=6.dp,bottom=16.dp))
                        Text("ENLACE M3U",fontSize=10.sp,color=Cyan,fontWeight=FontWeight.Bold)
                        OutlinedTextField(value=sourceUrl,onValueChange={sourceUrl=it},modifier=Modifier.fillMaxWidth(),singleLine=true,placeholder={Text("https://servidor/lista.m3u")})
                        Button(onClick={scope.launch {busy=true;try{val text=withContext(Dispatchers.IO){httpGet(sourceUrl)};channels=parseM3u(text);context.openFileOutput("master_playlist.m3u",0).use{it.write(text.toByteArray())};message="Lista M3U cargada: ${channels.size} elementos.";page="Canales"}catch(e:Exception){message=e.message?:"No se pudo cargar la lista."};busy=false}},enabled=sourceUrl.startsWith("http")&&!busy,modifier=Modifier.fillMaxWidth()){Text(if(busy)"Cargando…" else "Cargar lista M3U")}
                        HorizontalDivider(Modifier.padding(vertical=16.dp),color=Muted.copy(alpha=.2f))
                        Text("XTREAM CODES",fontSize=10.sp,color=Cyan,fontWeight=FontWeight.Bold)
                        OutlinedTextField(value=xtreamServer,onValueChange={xtreamServer=it},modifier=Modifier.fillMaxWidth(),singleLine=true,placeholder={Text("URL del servidor")})
                        OutlinedTextField(value=xtreamUser,onValueChange={xtreamUser=it},modifier=Modifier.fillMaxWidth(),singleLine=true,placeholder={Text("Usuario")})
                        OutlinedTextField(value=xtreamPass,onValueChange={xtreamPass=it},modifier=Modifier.fillMaxWidth(),singleLine=true,placeholder={Text("Contraseña")})
                        Button(onClick={scope.launch {busy=true;try{val base=xtreamServer.trimEnd('/');val text=withContext(Dispatchers.IO){httpGet("$base/get.php?username=$xtreamUser&password=$xtreamPass&type=m3u_plus&output=ts")};channels=parseM3u(text);message="Xtream conectado: ${channels.size} elementos.";page="Canales"}catch(e:Exception){message=e.message?:"No se pudo conectar Xtream."};busy=false}},enabled=xtreamServer.startsWith("http")&&xtreamUser.isNotBlank()&&xtreamPass.isNotBlank()&&!busy,modifier=Modifier.fillMaxWidth()){Text("Conectar Xtream")}
                        HorizontalDivider(Modifier.padding(vertical=16.dp),color=Muted.copy(alpha=.2f))
                        Text("ACTIVAR DISPOSITIVO",fontSize=10.sp,color=Cyan,fontWeight=FontWeight.Bold)
                        Text("Introduce el código de 6 dígitos generado desde tu panel de cliente.",fontSize=11.sp,color=Muted,modifier=Modifier.padding(vertical=7.dp))
                        OutlinedTextField(value=pairingCode,onValueChange={pairingCode=it.filter(Char::isDigit).take(6)},modifier=Modifier.fillMaxWidth(),singleLine=true,keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Number),placeholder={Text("000000")})
                        Button(onClick={scope.launch {busy=true;try{val androidId=Settings.Secure.getString(context.contentResolver,Settings.Secure.ANDROID_ID)?:error("No se pudo leer el ID del equipo");val fingerprint=sha256(androidId);val body=JSONObject().put("code",pairingCode).put("fingerprint",fingerprint).put("deviceName",android.os.Build.MODEL).put("platform",if(android.os.Build.MANUFACTURER.equals("amazon",true))"tv_box" else "android_tv");val response=withContext(Dispatchers.IO){httpPostJson("https://jmskuukgzxqmbbybpllq.supabase.co/functions/v1/redeem-device-pairing",body)};message=if(response.optBoolean("success"))"Dispositivo activado correctamente." else response.optString("error","No se pudo activar.")}catch(e:Exception){message=e.message?:"Error de activación"};busy=false}},enabled=pairingCode.length==6&&!busy,modifier=Modifier.fillMaxWidth()){Text(if(busy)"Procesando…" else "Activar este dispositivo")}
                        Text(message,fontSize=11.sp,color=Muted,modifier=Modifier.padding(top=10.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ChannelRow(channel:Channel,onClick:()->Unit){
    Row(Modifier.fillMaxWidth().padding(vertical=5.dp).background(Panel,RoundedCornerShape(10.dp)).clickable{onClick()}.padding(13.dp),verticalAlignment=Alignment.CenterVertically){
        Box(Modifier.size(35.dp).background(Blue.copy(alpha=.18f),RoundedCornerShape(9.dp)),contentAlignment=Alignment.Center){Icon(Icons.Default.LiveTv,null,tint=Cyan)}
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)){Text(channel.name,fontSize=12.sp,fontWeight=FontWeight.SemiBold);Text(channel.group,fontSize=10.sp,color=Muted)}
        Icon(Icons.Default.PlayArrow,null,tint=Cyan)
    }
}

private fun parseM3u(text:String):List<Channel>{
    val result= mutableListOf<Channel>()
    var name="Canal";var group="General";var logo:String?=null
    text.lineSequence().forEach{raw->
        val line=raw.trim()
        if(line.startsWith("#EXTINF",true)){
            val comma=line.lastIndexOf(',')
            name=if(comma>=0)line.substring(comma+1).trim().ifBlank{"Canal"} else "Canal"
            group=Regex("group-title=\"([^\"]*)\"").find(line)?.groupValues?.getOrNull(1)?.ifBlank{"General"}?:"General"
            logo=Regex("tvg-logo=\"([^\"]*)\"").find(line)?.groupValues?.getOrNull(1)
        }else if(line.isNotBlank()&&!line.startsWith("#")&&(line.startsWith("http://")||line.startsWith("https://"))){
            result.add(Channel(name,line,group,logo));name="Canal";group="General";logo=null
        }
    }
    return result
}

private fun httpGet(address:String):String{
    require(address.startsWith("http://")||address.startsWith("https://")){"URL no válida"}
    val connection=URL(address).openConnection() as HttpURLConnection
    connection.connectTimeout=20000;connection.readTimeout=30000;connection.setRequestProperty("User-Agent","MasterIPTVPlayer/1.0")
    try{if(connection.responseCode !in 200..299)error("El servidor respondió ${connection.responseCode}");return BufferedReader(InputStreamReader(connection.inputStream)).use{it.readText()}}finally{connection.disconnect()}
}

private fun httpPostJson(address:String,body:JSONObject):JSONObject{
    val connection=URL(address).openConnection() as HttpURLConnection
    connection.requestMethod="POST";connection.connectTimeout=15000;connection.readTimeout=20000;connection.doOutput=true
    connection.setRequestProperty("Content-Type","application/json")
    connection.setRequestProperty("apikey","sb_publishable_NwuFfQmLwX8OXMgh9-39Ng_NklGgxQj")
    connection.outputStream.use{it.write(body.toString().toByteArray())}
    try{
        val stream=if(connection.responseCode in 200..299)connection.inputStream else connection.errorStream
        val result=BufferedReader(InputStreamReader(stream)).use{it.readText()}
        val json=JSONObject(result)
        if(connection.responseCode !in 200..299)throw IllegalStateException(json.optString("error","No se pudo completar la solicitud"))
        return json
    }finally{connection.disconnect()}
}

private fun sha256(value:String):String=MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString(""){"%02x".format(it)}
