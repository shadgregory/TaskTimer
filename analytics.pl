#!/usr/bin/env perl
use Geo::IP;
use Date::Calc::Object qw(:all);
use Data::Dumper;
#open FILE, "tommywindich.log" or die $!;
open FILE, "tranquiltrak.log" or die $!;
my %hsh = ();
my $visit_struct = {};
my %month_hash = ();
$month_hash{'Jan'} = 1;
$month_hash{'Feb'} = 2;
$month_hash{'Mar'} = 3;
$month_hash{'Apr'} = 4;
$month_hash{'May'} = 5;
$month_hash{'Jun'} = 6;
$month_hash{'Jul'} = 7;
$month_hash{'Aug'} = 8;
$month_hash{'Sep'} = 9;
$month_hash{'Oct'} = 10;
$month_hash{'Nov'} = 11;
$month_hash{'Dec'} = 12;
my %robots_hsh = {};
while (<FILE>) {
	chomp;
	if ($_ !~ m/base\.css/) {
		next;
	}
	#next if ($_ =~ m/mint/);
	#next if ($_ =~ m/yui/);
	#next if ($_ =~ m/\.css/);
	#next if ($_ =~ m/png/);
	#next if ($_ =~ m/ttf/);
	#next if ($_ =~ m/favicon/);
	#next if ($_ =~ m/woff/);
	#next if ($_ =~ m/chili/);
	#next if ($_ =~ m/\.js/);
	next if ($_ =~ m/72\.177\.38\.135/); #home
	next if ($_ =~ m/24\.113\.188\.6/); #rocklin CA
	#if (!$hsh{$ip_address}) {
	#	$hsh{$ip_address} = {};
	#}
	my @line_array = split(/\s/, $_);
	my $ip_address = $line_array[0];
	my $date = $line_array[3];
	if ($_ =~ m/robots/) {
	    $robots_hsh{$ip_address} = 1;
	    next;
	}
	next if ($robots_hsh{$ip_address});
	$date =~ s/\[//g;
	$date =~ s/\]//g;
	@date_array = split('/', $date);
	$day = $date_array[0];
	$month = $date_array[1];
	@year_array = split(":", $date_array[2]);
	$year = $year_array[0];
	$hour = $year_array[1];
	$min = $year_array[2];
	$sec = $year_array[3];
	$date_object = Date::Calc->new(0, $year, $month_hash{$month}, $day, $hour, $min, $sec);
	$hsh{$ip_address}->{count} = 0 if (!$hsh{$ip_address}->{count});
	$hsh{$ip_address}->{count}++;
	if (!$hsh{$ip_address}->{date}){
	    $hsh{$ip_address}->{date} = $date_object 
	} elsif ($hsh{$ip_address}->{date} lt $date_object) {
	    $hsh{$ip_address}->{date} = $date_object 
	}
}

format ANALYTICS =
  @<<<<<<<<<<<<<<  @<<<<<<<<<<<<<<<<  @<<<<<<<<<<<<<<<< @<<<<  @<<<<<<  @<<<<<<<<<<<<<<
  $ip_address,     $city,          	  $state,           $code, $visits, $visit_date
.
format ANALYTICS_TOP =
  @||||||||||||||||||||||||||||||||||||  Pg @<
  "Visits to TranquilTrak",        $%

  IP Address       City              State            Code  Visits Date
  ---------------  ----------------  ---------------  ----  ------ --------------
.
open(ANALYTICS, ">report") || die "Can't create new file, error = $!\n";

#foreach $value (sort {$hsh{$b}->{count} <=> $hsh{$a}->{count} } keys %hsh) {
foreach $value (sort {$hsh{$b}->{date} <=> $hsh{$a}->{date} } keys %hsh) {
		next if (!$value);
	$gi = Geo::IP->open("/home/shad/mysrc/tasktimer/GeoLiteCity.dat", GEOIP_STANDARD);
	$ip_address = $value;
	$visits = $hsh{$value}->{count};
	$record = $gi->record_by_addr($ip_address);
	$code = $record->country_code;
	$city = $record->city;
	$ctry = $record->country_name;
	$state = $record->region_name;
	$y = $hsh{$value}->{date}->year();
	$m = $hsh{$value}->{date}->month();
	$d = $hsh{$value}->{date}->day();
	$visit_date = "$m/$d/$y";
	write(ANALYTICS);
}
