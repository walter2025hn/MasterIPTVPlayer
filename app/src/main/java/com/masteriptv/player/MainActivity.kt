package com.masteriptv.player
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlin.random.Random

private val Navy = Color(0xFF080F1B)
private val Panel = Color(0xFF111D2D)
private val Blue = Color(0xFF2799E8)
private val Cyan = Color(0xFF4AD3E5)
private val Muted = Color(0xFF9AAEC4)
private const val SUPABASE_URL = "https://jmskuukgzxqmbbybpllq.supabase.co"
private const val SUPABASE_KEY = "sb_publishable_NwuFfQmLwX8OXMgh9-39Ng_NklGgxQj"
private const val WEB_PANEL = "https://masteriptvplayer.vercel.app"

data class Channel(val name:String,val url:String,val group:String="Todos",val logo:String?=null)
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState:Bundle?) { super.onCreate(savedInstanceState); setContent { MasterPlayerApp() } }
}

@Composable
fun MasterPlayerApp() {
    val context=LocalContext.current
    val androidId=remember { Settings.Secure.getString(context.contentResolver,Settings.Secure.ANDROID_ID) ?: "master-device" }
    val fingerprint=remember { sha256(androidId) }
    val deviceName=remember { android.os.Build.MODEL ?: "Android" }
    val platform=remember { if(context.packageManager.hasSystemFeature("android.software.leanback")) "android_tv" else "android_phone" }
    val pairingCode=remember { Random.nextInt(0,1_000_000).toString().padStart(6,'0') }
    val qrBitmap=remember(pairingCode) { makeQrBitmap("$WEB_PANEL/devices?code=$pairingCode") }
    var status by remember { mutableStateOf("Esperando que vincules este dispositivo desde el panel de cliente.") }
    var activated by remember { mutableStateOf(false) }
    var channels by remember { mutableStateOf(listOf<Channel>()) }
    var selected by remember { mutableStateOf<Channel?>(null) }
    var query by remember { mutableStateOf("") }
    var page by remember { mutableStateOf("Inicio") }
    val player=remember { ExoPlayer.Builder(context).build() }
    fun play(channel:Channel) { selected=channel; player.setMediaItem(MediaItem.fromUri(channel.url)); player.prepare(); player.playWhenReady=true }
    DisposableEffect(Unit) { onDispose { player.release() } }

    LaunchedEffect(Unit) {
        val saved=withContext(Dispatchers.IO) { runCatching { context.openFileInput("master_playlist.m3u").bufferedReader().use { it.readText() } }.getOrNull() }
        if(!saved.isNullOrBlank()) { channels=parseM3u(saved); if(channels.isNotEmpty()) { activated=true; status="Lista guardada: "+channels.size+" elementos." } }
    }
    LaunchedEffect(pairingCode,activated) {
        val expires=System.currentTimeMillis()+10*60*1000
        while(!activated && System.currentTimeMillis()<expires) {
            try {
                val result=withContext(Dispatchers.IO) {
                    httpPostJson("$SUPABASE_URL/functions/v1/redeem-device-pairing",
                        JSONObject().put("code",pairingCode).put("fingerprint",fingerprint).put("deviceName",deviceName).put("platform",platform))
                }
                if(result.optBoolean("success")) {
                    val deviceId=result.optString("device_id")
                    status="Dispositivo vinculado. Cargando tu lista…"
                    val text=withContext(Dispatchers.IO) {
                        httpPostText("$WEB_PANEL/api/player/playlist",JSONObject().put("deviceId",deviceId).put("fingerprint",fingerprint))
                    }
                    val parsed=parseM3u(text)
                    if(parsed.isEmpty()) error("La lista activada no contiene elementos reproducibles.")
                    context.openFileOutput("master_playlist.m3u",0).use { it.write(text.toByteArray()) }
                    channels=parsed; activated=true; status="¡Dispositivo activado! "+parsed.size+" elementos cargados."; page="Canales"
                    break
                }
            } catch(e:Exception) {
                val reason=e.message.orEmpty()
                if(reason.contains("cuenta",true)||reason.contains("límite",true)||reason.contains("vencido",true)||reason.contains("suspendida",true)) { status=reason; break }
            }
            delay(2500)
        }
        if(!activated && status.startsWith("Esperando")) status="El código venció. Cierra y abre la app para generar uno nuevo."
    }

    val visible=channels.filter { it.name.contains(query,true) }
    MaterialTheme(colorScheme=darkColorScheme(primary=Blue,background=Navy,surface=Panel,onBackground=Color.White,onSurface=Color.White)) {
        Scaffold(containerColor=Navy,bottomBar={
            if(activated) NavigationBar(containerColor=Panel,contentColor=Color.White) {
                listOf("Inicio","Canales").forEach { item ->
                    NavigationBarItem(selected=page==item,onClick={page=item},icon={Icon(Icons.Default.LiveTv,contentDescription=item)},label={Text(item)},
                        colors=NavigationBarItemDefaults.colors(selectedIconColor=Cyan,selectedTextColor=Cyan,indicatorColor=Blue.copy(alpha=.18f),unselectedIconColor=Muted,unselectedTextColor=Muted))
                }
            }
        }) { padding ->
            Column(Modifier.fillMaxSize().padding(padding).background(Navy)) {
                Row(Modifier.fillMaxWidth().padding(horizontal=20.dp,vertical=14.dp),verticalAlignment=Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).background(Blue,RoundedCornerShape(13.dp)),contentAlignment=Alignment.Center) { Text("M",fontSize=24.sp,fontWeight=FontWeight.Black,color=Color.White) }
                    Spacer(Modifier.width(12.dp))
                    Column { Text("MASTER",fontWeight=FontWeight.ExtraBold,letterSpacing=2.sp,fontSize=17.sp); Text("IPTV PLAYER",fontSize=9.sp,letterSpacing=2.sp,color=Cyan) }
                    Spacer(Modifier.weight(1f)); Text(if(activated) "CONECTADO" else "VINCULAR TV",fontSize=9.sp,color=if(activated) Cyan else Muted)
                }
                if(selected!=null) {
                    AndroidView(factory={ PlayerView(it).apply { this.player=player; useController=true } },modifier=Modifier.fillMaxWidth().height(230.dp).background(Color.Black))
                    Row(Modifier.fillMaxWidth().padding(horizontal=18.dp,vertical=8.dp),verticalAlignment=Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { Text(selected!!.name,fontWeight=FontWeight.Bold); Text(selected!!.group,color=Muted,fontSize=11.sp) }
                        TextButton(onClick={player.pause();selected=null}) { Text("Cerrar") }
                    }
                } else if(!activated) {
                    Column(Modifier.fillMaxSize().padding(horizontal=20.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center) {
                        Text("VINCULA TU DISPOSITIVO",color=Cyan,fontSize=11.sp,fontWeight=FontWeight.Bold,letterSpacing=1.5.sp)
                        Spacer(Modifier.height(8.dp)); Text("Escanea el QR o escribe este código en tu panel de cliente",color=Color.White,fontSize=14.sp)
                        Spacer(Modifier.height(20.dp))
                        qrBitmap?.let { Image(bitmap=it.asImageBitmap(),contentDescription="Código QR para vincular Master IPTV Player",modifier=Modifier.size(190.dp).background(Color.White,RoundedCornerShape(12.dp)).padding(8.dp)) }
                        Spacer(Modifier.height(16.dp)); Text(pairingCode,color=Color.White,fontSize=36.sp,fontWeight=FontWeight.ExtraBold,letterSpacing=8.sp)
                        Spacer(Modifier.height(12.dp)); Text(status,color=Muted,fontSize=12.sp)
                        Spacer(Modifier.height(8.dp)); Text("El código es válido durante 10 minutos.",color=Muted,fontSize=10.sp)
                    }
                } else {
                    when(page) {
                        "Inicio" -> Column(Modifier.fillMaxSize().padding(18.dp)) {
                            Text("Tu entretenimiento",fontSize=23.sp,fontWeight=FontWeight.Bold)
                            Text(status,color=Muted,fontSize=12.sp,modifier=Modifier.padding(top=6.dp,bottom=18.dp))
                            Box(Modifier.fillMaxWidth().height(130.dp).background(Panel,RoundedCornerShape(18.dp)),contentAlignment=Alignment.Center) {
                                Column(horizontalAlignment=Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.LiveTv,null,tint=Cyan,modifier=Modifier.size(36.dp))
                                    Text(channels.size.toString()+" elementos disponibles",fontWeight=FontWeight.Bold)
                                    Text("Canales · Películas · Series",color=Muted,fontSize=11.sp)
                                }
                            }
                            Spacer(Modifier.height(16.dp)); Text("CONTINUAR VIENDO",color=Cyan,fontSize=10.sp,fontWeight=FontWeight.Bold)
                            channels.take(6).forEach { item -> ChannelRow(item) { play(item) } }
                        }
                        else -> Column(Modifier.fillMaxSize().padding(horizontal=16.dp)) {
                            OutlinedTextField(value=query,onValueChange={query=it.uppercase()},modifier=Modifier.fillMaxWidth(),singleLine=true,
                                placeholder={Text("BUSCAR CANALES, PELÍCULAS O SERIES")},leadingIcon={Icon(Icons.Default.Search,null)})
                            Spacer(Modifier.height(8.dp)); LazyColumn(Modifier.fillMaxSize()) { items(visible) { item -> ChannelRow(item) { play(item) } } }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChannelRow(channel:Channel,onClick:()->Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical=5.dp).background(Panel,RoundedCornerShape(10.dp)).clickable { onClick() }.padding(13.dp),verticalAlignment=Alignment.CenterVertically) {
        Box(Modifier.size(35.dp).background(Blue.copy(alpha=.18f),RoundedCornerShape(9.dp)),contentAlignment=Alignment.Center) { Icon(Icons.Default.LiveTv,null,tint=Cyan) }
        Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(channel.name,fontSize=12.sp,fontWeight=FontWeight.SemiBold); Text(channel.group,fontSize=10.sp,color=Muted) }
        Icon(Icons.Default.PlayArrow,null,tint=Cyan)
    }
}

private fun makeQrBitmap(value:String):android.graphics.Bitmap? = runCatching {
    val matrix=QRCodeWriter().encode(value,BarcodeFormat.QR_CODE,420,420)
    android.graphics.Bitmap.createBitmap(420,420,android.graphics.Bitmap.Config.RGB_565).also { bitmap ->
        for(x in 0 until 420) for(y in 0 until 420) bitmap.setPixel(x,y,if(matrix[x,y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
    }
}.getOrNull()

private fun parseM3u(text:String):List<Channel> {
    val result=mutableListOf<Channel>(); var name="Canal"; var group="General"; var logo:String?=null
    text.lineSequence().forEach { raw ->
        val line=raw.trim()
        if(line.startsWith("#EXTINF",true)) {
            val comma=line.lastIndexOf(','); name=if(comma>=0) line.substring(comma+1).trim().ifBlank { "Canal" } else "Canal"
            group=Regex("group-title=\\"([^\\"]*)\\"").find(line)?.groupValues?.getOrNull(1)?.ifBlank { "General" } ?: "General"
            logo=Regex("tvg-logo=\\"([^\\"]*)\\"").find(line)?.groupValues?.getOrNull(1)
        } else if(line.isNotBlank()&&!line.startsWith("#")&&(line.startsWith("http://")||line.startsWith("https://"))) {
            result.add(Channel(name,line,group,logo)); name="Canal"; group="General"; logo=null
        }
    }
    return result
}

private fun httpPostJson(address:String,body:JSONObject):JSONObject {
    val c=URL(address).openConnection() as HttpURLConnection
    c.requestMethod="POST"; c.connectTimeout=12000; c.readTimeout=15000; c.doOutput=true
    c.setRequestProperty("Content-Type","application/json"); c.setRequestProperty("apikey",SUPABASE_KEY)
    c.outputStream.use { it.write(body.toString().toByteArray()) }
    try {
        val stream=if(c.responseCode in 200..299)c.inputStream else c.errorStream
        val result=BufferedReader(InputStreamReader(stream)).use { it.readText() }
        val json=JSONObject(result)
        if(c.responseCode !in 200..299) throw IllegalStateException(json.optString("error","Esperando vinculación…"))
        return json
    } finally { c.disconnect() }
}

private fun httpPostText(address:String,body:JSONObject):String {
    val c=URL(address).openConnection() as HttpURLConnection
    c.requestMethod="POST"; c.connectTimeout=15000; c.readTimeout=60000; c.doOutput=true
    c.setRequestProperty("Content-Type","application/json"); c.outputStream.use { it.write(body.toString().toByteArray()) }
    try {
        val stream=if(c.responseCode in 200..299)c.inputStream else c.errorStream
        val result=BufferedReader(InputStreamReader(stream)).use { it.readText() }
        if(c.responseCode !in 200..299) throw IllegalStateException(runCatching { JSONObject(result).optString("error") }.getOrNull() ?: "No se pudo descargar la lista.")
        return result
    } finally { c.disconnect() }
}

private fun sha256(value:String):String=MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString("") { "%02x".format(it) }
