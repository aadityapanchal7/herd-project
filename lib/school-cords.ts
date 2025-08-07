export interface VenueCoords {
    latitude: number;
    longitude: number;
  }
  
  export const VENUE_COORDS: Record<
  string, // school name
  Record<string, VenueCoords> >= {
    ut_austin: {
    "Almetris Duren Residence Hall": { latitude: 30.29147797170537, longitude:-97.74018424787246 },
    "Anna Hiss Gymnasium": { latitude: 330.288527598330045, longitude:-97.73789459801412 },
    "Arno Nowotny Building": { latitude: 30.27823917197153, longitude:-97.73103341531434 },
    "Andrews Residence Hall": { latitude: 30.288188063377394, longitude:-97.73990065273168 },
    "Art Building and Museum": { latitude: 30.28589159767631, longitude:-97.73296363670158 },      
    "Aerospace Engineering Building": {
      "latitude": 30.291084300484847,
      "longitude": -97.73754029183225
  },
  "AT&T Executive Education & Conf Center": {
      "latitude": 30.28167088456957,
      "longitude": -97.74052409966893
  },
  "Batts Hall": {
      "latitude": 30.284856311597967,
      "longitude": -97.73897052409022
  },
  "L. Theo Bellmont Hall": {
      "latitude": 30.283877259795123,
      "longitude": -97.7337058926767
  },
  "Benedict Hall": {
      "latitude": 30.284002665315118,
      "longitude": -97.73907106308069
  },
  "Biological Sciences Greenhouses": {
      "latitude": 30.286994216555062,
      "longitude": -97.73864623288863
  },
  "Brackenridge Residence Hall": {
      "latitude": 30.28319044921991,
      "longitude": -97.73590929412036
  },
  "Biological Laboratories": {
      "latitude": 30.287282839337962,
      "longitude": -97.73985076283367
  },
  "Blanton Residence Hall": {
      "latitude": 30.28854836052204,
      "longitude": -97.73944140667066
  },
  "Jack S. Blanton Museum of Art": {
      "latitude": 30.280803265283673,
      "longitude": -97.73778685466544
  },
  "Biomedical Engineering Building": {
      "latitude": 30.289392439534073,
      "longitude": -97.73870853569929
  },
  "Blanton Museum Ellsworth Kelly": {
      "latitude": 30.281736320778805,
      "longitude": -97.73782080559269
  },
  "Blanton Museum Smith Building": {
      "latitude": 30.281142644253165,
      "longitude": -97.73819192227114
  },
  "Biological Greenhouse": {
      "latitude": 30.287192559609426,
      "longitude": -97.73975880549379
  },
  "Bernard and Audre Rapoport Building": {
      "latitude": 30.285238905871132,
      "longitude": -97.73676220971105
  },
  "Brazos Garage": {
      "latitude": 30.281261114921172,
      "longitude": -97.73646381865429
  },
  "Basketball Support Building (Rec Sport)": {
      "latitude": 30.281437676691283,
      "longitude": -97.73543426313961
  },
  "Battle Hall": {
      "latitude": 30.28540863600708,
      "longitude": -97.74024336438706
  },
  "Burdine Hall": {
      "latitude": 30.288825492505286,
      "longitude": -97.7382218635489
  },
  "Calhoun Hall": {
      "latitude": 30.284490114866717,
      "longitude": -97.74015576573126
  },
  "College of Business Administration": {
      "latitude": 30.284230414158912,
      "longitude": -97.73783618234405
  },
  "Connally Center for Justice": {
      "latitude": 30.28813305409281,
      "longitude": -97.7305000898182
  },
  "Comal Child Development Center Annex": {
      "latitude": 30.282930305558796,
      "longitude": -97.72566150269505
  },
  "Collections Deposit Library": {
      "latitude": 30.278748128534467,
      "longitude": -97.73296978717721
  },
  "Caven Clark Field Support Building": {
      "latitude": 30.28163382282598,
      "longitude": -97.73486649002972
  },
  "Caven Lacrosse and Sports Center": {
      "latitude": 30.281074112122337,
      "longitude": -97.73467329337403
  },
  "Jesse H. Jones Comm. Center (Bldg. A)": {
      "latitude": 30.289362294783572,
      "longitude": -97.74079560881131
  },
  "Jesse H. Jones Comm. Center (Bldg. B)": {
      "latitude": 30.289255922784104,
      "longitude": -97.74124228690916
  },
  "Chemical and Petroleum Engineering": {
      "latitude": 30.2900850488705,
      "longitude": -97.73649406673027
  },
  "Carothers Residence Hall": {
      "latitude": 30.2886845689789,
      "longitude": -97.74008689777295
  },
  "Creekside Residence Hall": {
      "latitude": 30.28849180938197,
      "longitude": -97.73305653893733
  },
  "Dobie Twenty21": {
      "latitude": 30.28331717704246,
      "longitude": -97.74148745479317
  },
  "E. William Doty Fine Arts Building": {
      "latitude": 30.285953762258888,
      "longitude": -97.73190450145925
  },
  "UFCU Disch-Falk Field": {
      "latitude": 30.279717481443107,
      "longitude": -97.72629471375957
  },
  "G. B. Dealey Center for New Media": {
      "latitude": 30.29028479565082,
      "longitude": -97.74092700701313
  },
  "Dell Pediatric Research Institute": {
      "latitude": 30.304814730397464,
      "longitude": -97.70411742979068
  },
  "Dinosaur Trackway Bldg.": {
      "latitude": 30.28731506727763,
      "longitude": -97.73222574854705
  },
  "Ernest Cockrell Jr. Hall": {
      "latitude": 30.28893139204794,
      "longitude": -97.73552350166929
  },
  "Engr Education and Research Center": {
      "latitude": 30.288080508333845,
      "longitude": -97.73555188368478
  },
  "E.P. Schoch Building": {
      "latitude": 30.285775739480957,
      "longitude": -97.73680597817727
  },
  "Engineering Teaching Center II": {
      "latitude": 30.289878471243473,
      "longitude": -97.73550435085704
  },
  "Peter T. Flawn Academic Center": {
      "latitude": 30.28634469496842,
      "longitude": -97.74026855155067
  },
  "Larry R. Faulkner Nano Sci and Tech": {
      "latitude": 30.28789758740698,
      "longitude": -97.73801543418834
  },
  "Garrison Hall": {
      "latitude": 30.2851934758194,
      "longitude": -97.73861941613757
  },
  "Gates Dell Complex": {
      "latitude": 30.286250665637812,
      "longitude": -97.73666519543949
  },
  "Mary E. Gearing Hall": {
      "latitude": 30.287798183310578,
      "longitude": -97.73919916100894
  },
  "Dorothy L. Gebauer Building": {
      "latitude": 30.284806917050624,
      "longitude": -97.73551007589859
  },
  "Gary L Thomas Energy Engr Bldg": {
      "latitude": 30.287473582230742,
      "longitude": -97.73620750852744
  },
  "Goldsmith Hall": {
      "latitude": 30.285261574955296,
      "longitude": -97.74125618308841
  },
  "Gregory Gymnasium": {
      "latitude": 30.284216714390805,
      "longitude": -97.73672941020796
  },
  "Graduate School of Business Bldg.": {
      "latitude": 30.284140645977175,
      "longitude": -97.7384496781887
  },
  "Gordon-White Building": {
      "latitude": 30.287737395328808,
      "longitude": -97.74000581469157
  },
  "Hogg Memorial Auditorium": {
      "latitude": 30.286884873910775,
      "longitude": -97.74053539477013
  },
  "Harry Ransom Center": {
      "latitude": 30.284307270058157,
      "longitude": -97.74124390631127
  },
  "Rainey Hall": {
      "latitude": 30.28400238705177,
      "longitude": -97.74020841541176
  },
  "William Randolph Hearst Bldg": {
      "latitude": 30.288981089912237,
      "longitude": -97.7407440516336
  },
  "Indoor Practice Facility": {
      "latitude": 30.286262045855892,
      "longitude": -97.72656327019568
  },
  "Jester Residence Hall": {
      "latitude": 30.28285855460658,
      "longitude": -97.73672762937656
  },
  "Jackson Geological Sciences Bldg.": {
      "latitude": 30.28605702186507,
      "longitude": -97.73672190368904
  },
  "John W. Hargis Hall": {
      "latitude": 30.27844985326865,
      "longitude": -97.73196281252262
  },
  "Jesse H. Jones Hall": {
      "latitude": 30.288669164721796,
      "longitude": -97.73169730259482
  },
  "Kinsolving Residence Hall": {
      "latitude": 30.290371647111446,
      "longitude": -97.73994143645014
  },
  "Lake Austin Centre": {
      "latitude": 30.2850301534285,
      "longitude": -97.77869877392155
  },
  "Lyndon B Johnson Library": {
      "latitude": 30.285782228846774,
      "longitude": -97.72911063086322
  },
  "Longhorn Dining Facility": {
      "latitude": 30.2825656986202,
      "longitude": -97.7359204190121
  },
  "Littlefield Home": {
      "latitude": 30.288037757982462,
      "longitude": -97.74077150913918
  },
  "Littlefield Residence Hall": {
      "latitude": 30.289309370629493,
      "longitude": -97.73972045711004
  },
  "Laboratory Theater Bldg.": {
      "latitude": 30.285898238944625,
      "longitude": -97.73517080307086
  },
  "Main Building (UT Tower)": {
      "latitude": 30.286061568435674,
      "longitude": -97.73937157223914
  },
  "Moffett Molecular Biology Bldg.": {
      "latitude": 30.28849216028356,
      "longitude": -97.73719691263362
  },
  "Moody Center": {
      "latitude": 30.280795346215452,
      "longitude": -97.73072517317165
  },
  "Mezes Hall": {
      "latitude": 30.28436432960496,
      "longitude": -97.73914050201421
  },
  "Richard Mithoff Trk/Scr Fieldhouse": {
      "latitude": 30.282011271496,
      "longitude": -97.73133997717582
  },
  "Moore-Hill Residence Hall": {
      "latitude": 30.28351254994515,
      "longitude": -97.73554726177733
  },
  "Mike A.Myers Track & Soccer Stadium": {
      "latitude": 30.282551780282006,
      "longitude": -97.73024202235698
  },
  "Moncrief-Neuhaus Athletic Center": {
      "latitude": 30.282440445269337,
      "longitude": -97.73235015398075
  },
  "Music Building & Recital Hall": {
      "latitude": 30.287414090278748,
      "longitude": -97.7311761216976
  },
  "2400 Nueces": {
      "latitude": 30.28810826207928,
      "longitude": -97.74325931820213
  },
  "Norman Hackerman Building": {
      "latitude": 30.287560688036134,
      "longitude": -97.73803556535555
  },
  "Neural and Molecular Science Bldg.": {
      "latitude": 30.28852276948697,
      "longitude": -97.73723830870857
  },
  "Nursing School": {
      "latitude": 30.277626862818003,
      "longitude": -97.73337874763801
  },
  "Performing Arts Center": {
      "latitude": 30.28612654248057,
      "longitude": -97.7312760019542
  },
  "T.S. Painter Hall": {
      "latitude": 30.28708511820956,
      "longitude": -97.73862580925211
  },
  "Parlin Hall": {
      "latitude": 30.28489947221559,
      "longitude": -97.74009954359833
  },
  "J.T. Patterson Labs.Bldg.": {
      "latitude": 30.288006614876767,
      "longitude": -97.73647612612335
  },
  "Roberts Residence Hall": {
      "latitude": 30.283085364742586,
      "longitude": -97.7351945090296
  },
  "Robert B. Rowling Hall": {
      "latitude": 30.281833916936254,
      "longitude": -97.74126101591094
  },
  "Recreational Sports Center": {
      "latitude": 30.281498844623947,
      "longitude": -97.73287453564726
  },
  "Red and Charline McCombs Field": {
      "latitude": 30.28068484480533,
      "longitude": -97.725065286775
  },
  "Sarah M. & Charles E. Seay Building": {
      "latitude": 30.289714850767016,
      "longitude": -97.73719423350087
  },
  "San Jacinto Residence Hall": {
      "latitude": 30.28272556499296,
      "longitude": -97.73447119393859
  },
  "Sid Richardson Hall": {
      "latitude": 30.285713187452142,
      "longitude": -97.7286950609824
  },
  "Darrell K Royal Tx Memorial Stadium": {
      "latitude": 30.283531405787446,
      "longitude": -97.73247404659284
  },
  "George I. Sanchez Building": {
      "latitude": 30.281759974909786,
      "longitude": -97.73881842540048
  },
  "Joe C Thompson Conference Center": {
      "latitude": 30.287273392606426,
      "longitude": -97.7291707677285
  },
  "Texas Cowboys Pavilion": {
      "latitude": 30.285033362780712,
      "longitude": -97.73403808981838
  },
  "Tx Science & Natural History Museum": {
      "latitude": 30.286992596082854,
      "longitude": -97.73232940237992
  },
  "Townes Hall": {
      "latitude": 30.2888898088201,
      "longitude": -97.7312077790011
  },
  "Texas Tennis Center": {
      "latitude": 30.281297074910043,
      "longitude": -97.72594192540045
  },
  "Univ. Interscholastic League Bldg.": {
      "latitude": 30.283261450869446,
      "longitude": -97.72367508981839
  },
  "Union Building": {
      "latitude": 30.28648381040214,
      "longitude": -97.74079646098231
  },
  "University Teaching Center": {
      "latitude": 30.283112001922266,
      "longitude": -97.73881866159797
  },
  "Etter-Harbin Alumni Center": {
      "latitude": 30.284022663353863,
      "longitude": -97.73426426772859
  },
  "Waggener Hall": {
      "latitude": 30.285045232540963,
      "longitude": -97.73755145201986
  },
  "Will C. Hogg Bldg.": {
      "latitude": 30.28620966129609,
      "longitude": -97.73865162879729
  },
  "William C. Powers Jr. SAC": {
      "latitude": 30.284860295013427,
      "longitude": -97.73672037388758
  },
  "Robert A. Welch Hall": {
      "latitude": 30.286748078870446,
      "longitude": -97.73795345478007
  },
  "F.L. Winship Drama Bldg.": {
      "latitude": 30.285708043963,
      "longitude": -97.73457240972647
  },
  "Walter Webb Hall": {
      "latitude": 30.289189925808756,
      "longitude": -97.74165431357689
  },
  "Perry-Casta\u00f1eda Library": {
      "latitude": 30.28264295083686,
      "longitude": -97.73821375542367
  },
  "Alexander Architectural Archives": {
      "latitude": 30.285376785761592,
      "longitude": -97.74019805373607
  },
  "Architecture and Planning Library": {
      "latitude": 30.285266117720123,
      "longitude": -97.7407266076093
  },
  "Classics Library": {
      "latitude": 30.28499055447616,
      "longitude": -97.7376133987705
  },
  "McKinney Engineering Library": {
      "latitude": 30.287991266781184,
      "longitude": -97.73515508856333
  },
  "Fine Arts Library": {
      "latitude": 30.285862983425826,
      "longitude": -97.73175749155757
  },
  "Walter Geology Library": {
      "latitude": 30.285887579946635,
      "longitude": -97.73571285868421
  },
  "Life Science Library": {
      "latitude": 30.28612867332608,
      "longitude": -97.739370384781
  },
  "Physics Mathematics Astronomy Library": {
      "latitude": 30.289023940028738,
      "longitude": -97.73646246453973
  },
  "Dolph Briscoe Center for American History": {
      "latitude": 30.2852231241747,
      "longitude": -97.7288015278824
  },
  "Stark Center for Physical Culture and Sports": {
      "latitude": 30.28495448331701,
      "longitude": -97.7330102314175
  },
  "Tarlton Law Library": {
      "latitude": 30.288539991451202,
      "longitude": -97.73068469477634
  }
  }
};
  
export const MAP_CENTERS: Record<string, [number, number]> = {
  ut_austin: [-97.7364, 30.2862]
};