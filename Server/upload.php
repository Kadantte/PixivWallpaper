<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require("gradient.php");

$csvfile = array_map("str_getcsv",file("artwork_info.csv"));
$csvheader=array_shift($csvfile);

foreach($csvfile as $row){
    $csv[]=array_combine($csvheader,$row);
}

require("upload_user.php");

$dsn = "mysql:host=$host;port=$port;dbname=$db";

$pdo = new PDO($dsn, $user, $pass);

$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

function upload_img($img_path,$ranking,$illustid,$format,$type){
	$pdo=$GLOBALS["pdo"];
	$query=$pdo->prepare("INSERT INTO images(Image,Width,Height,AspectRatio,Checksum,Entropy,Format,Type,IllustID,Ranking,AvgGradient) VALUES(:img,:width,:height,:ratio,MD5(Image),999,:format,:type,:illustid,:ranking,:gradient)");
	$duplicate_query=$pdo->prepare("SELECT COUNT(*) FROM images WHERE Checksum=?");
	
	$img=fopen($img_path,"rb");
	$md5=md5_file($img_path);
	
	$duplicate_query->execute(array($md5));
	if($duplicate_query->fetch()[0]!=0){
		return;
	}
	
	$gradient=calc_gradient($img_path);
	
	$size=getimagesize($img_path);
	$ratio=$size[0]/$size[1];
	
	# Upload image
	$query->bindParam(":img",$img,PDO::PARAM_LOB);
	
	# Size
	$query->bindParam(":width",$size[0]);
	$query->bindParam(":height",$size[1]);
	$query->bindParam(":ratio",$ratio);
	
	# File info
	$query->bindParam(":format",$format);
	$query->bindParam(":type",$type);
	$query->bindParam(":gradient",$gradient);
	
	# Artwork info
	$query->bindParam(":ranking",$ranking);
	$query->bindParam(":illustid",$illustid);
	
	$query->execute();
}

foreach($csv as $row){
	if($row["Downloaded"]==1){
		$img_path="images/".$row["Filename"];
		$format=explode(".",$row["Filename"])[1];
		$ranking=$row["Rank"];
		$illustid=$row["IllustID"];
		upload_img($img_path,$ranking,$illustid,$format,"D");
		$img_path="images/".str_replace("d","t",$row["Filename"]);
		upload_img($img_path,$ranking,$illustid,$format,"T");
	}
}

echo "Insert successful";
?>
