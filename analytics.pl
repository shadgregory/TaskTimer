#!/usr/bin/env perl
use Geo::Coder::HostIP;
open FILE, "tommywindich.log" or die $!;
my %hsh = ();
while (<FILE>) {
	chomp;
    my @line_array = split(/\s/, $_);
    my $ip_address = $line_array[0];
    my $date = $line_array[3];
    $hsh{$ip_address}++;
}

format ANALYTICS =
  IP=@<<<<<<<<<<<<<  City=@||||||||||||||||  State=@|||||||||||| Code=@|||| Visits=@||||||
     $ip_address,         $city,          	   	   $state,            $code,       $visits
.
open(ANALYTICS, ">analytics.txt") || die "Can't create new file, error = $!\n";

foreach $value (sort {$hsh{$a} cmp $hsh{$b} } keys %hsh) {
    $geo = Geo::Coder::HostIP->new();
	$ip_address = $value;
	$visits = $hsh{$value};
    @results = $geo->FetchIP($ip_address);
	$code = "NA";
    if (@results > 0) {
		$code = $geo->CountryCode;
		$city = $geo->City;
		$ctry = $geo->Country;
		$state = $geo->State;
    }
	write(ANALYTICS);
}
