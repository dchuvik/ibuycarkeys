export interface PriceCatalogItem {
	sku: string;
	description: string;
	price: number;
	wornPrice: number | null;
	make: string;
}

const makeByPrefix: Record<string, string> = {
	ACU: "Acura",
	ALF: "Alfa Romeo",
	AUD: "Audi",
	BMW: "BMW",
	BUI: "Buick",
	CAD: "Cadillac",
	CHV: "Chevrolet",
	VET: "Corvette",
	GM: "GM",
	GMC: "GMC",
	CDJ: "Chrysler / Dodge / Jeep / RAM",
	CHR: "Chrysler",
	DDG: "Dodge",
	RAM: "RAM",
	FIA: "FIAT",
	FRD: "Ford",
	LIN: "Lincoln",
	HON: "Honda",
	HYU: "Hyundai / Genesis",
	INF: "Infiniti",
	JAG: "Jaguar",
	JEP: "Jeep",
	KIA: "Kia",
	LR: "Land Rover",
	LEX: "Lexus",
	MAZ: "Mazda",
	MB: "Mercedes-Benz",
	MIT: "Mitsubishi",
	NIS: "Nissan",
	POR: "Porsche",
	SCI: "Scion",
	SUB: "Subaru",
	SUZ: "Suzuki",
	TOY: "Toyota",
	VW: "Volkswagen",
	VVO: "Volvo",
};

const rawPriceCatalog = `
ACU.1/ACU.1W|Acura Smart Key FCC ID: ACJ8D8E24A04|40|20
ACU.2|Acura Smart Key - Style 1 - Any Button Configuration|40|
ACU.3/ACU.3W|Acura Smart Key - Style 2 - Any Button Configuration|15|3
ACU.4|Acura Smart Key - Style 3 Has Engine Starter - Any Button Configuration|35|
ACU.5/ACU.5W|Acura Flip Key - Any Button Configuration|3|1
ACU.6|Acura Remote - Style 1 - Any Button Configuration|0.25|
ACU.7|Acura Remote - Style 2 - Any Button Configuration|0.25|
ACU.8|Acura Smart Key - Style 4 - Any Button Configuration|25|
ACU.9|Acura Smart Key - Style 5 Has Engine Starter - Any Button Configuration|40|
ALF.1/ALF.1W|Alfa Romeo Smart Key|25|5
AUD.1|Audi Smart Key Proximity - White Sticker|3|
AUD.2|Audi Smart Key - Black Chip|3|
AUD.3|Audi Slot Key Non-Proximity|3|
AUD.4|Audi Smart Key Black Trunk Button|0.1|
AUD.5|Audi Smart Key Silver Trunk Button|0.1|
AUD.6|Audi Smart Key - Style 3|0.1|
AUD.7|Audi Flip Key - Style 1|1|
AUD.8|Audi Flip Key - Style 2|0.1|
BMW.1|BMW Smart Key Touchscreen|25|
BMW.2|BMW Smart Key - Must Be FCC ID: KR55WK49147 - Identified by having a battery cover on back|6|
BMW.3|BMW Smart Key - Style 2|1|
BMW.4|BMW Smart Key - Style 3 - Any Color|1|
BMW.5|BMW Smart Key - Style 4|3|
BUI.1|Buick Smart Key - Style 1 - Any Button Configuration|10|
BUI.2|Buick Smart Key - Style 2 - Any Button Configuration|10|
CAD.1|Cadillac Smart Key FCC ID: M3N65981403|30|
CAD.2/CAD.2W|Cadillac Smart Key - Has Key Insert Release - Any Button Configuration|10|2
CAD.3/CAD.3W|Cadillac Smart Key - Any Button Configuration|14|2
CAD.4/CAD.4W|Cadillac Remote - Any Button Configuration|4|1
CAD.5|Cadillac Smart Key - Any Button Configuration|12|
CHV.1/CHV.1W|Chevrolet Smart Key - Any Button Configuration|10|2
CHV.2/CHV.2W|Chevrolet Smart Key - Any Button Configuration|5|1
CHV.3|Chevrolet Smart Key - Style 2 - Any Button Configuration|10|
CHV.4/CHV.4W|Chevrolet Flip Key - Any Button Configuration|4|1
CHV.5/CHV.5W|Chevrolet Remote Chrome|5|1
VET.1|Corvette Smart Key - Style 1 - FCC ID: M3N65981403|40|
VET.2/VET.2W|Corvette Smart Key - Style 2 - Any Button Configuration|25|5
VET.3|Corvette Smart Key - Style 3 - Any Button Configuration|30|
GM.1/GM.1W|GM Remote 4 Button|5|1
GM.2/GM.2W|GM Remote 3 Button|5|1
GM.3|GM Remote Round - FCC ID: M3N5WY8109 - Any Button Configuration|1|
GM.4|GM Remote Round - FCC ID starts with OUC - Any Button Configuration|1|
GM.5|GM Remote Round - Part Number without FCC ID on back - Any Button Configuration|1|
GM.6|Chevrolet/GMC/Buick Flip Key - Any Button Configuration|3|
GM.7|GM Remote - Any Button Configuration|0.1|
GM.8|GM Remote FCC ID: L2C0007T - Any Button Configuration|0.1|
GMC.1|GMC Smart Key - Style 1 - Any Button Configuration|10|
GMC.2/GMC.2W|GMC Remote Chrome|5|1
GMC.3|GMC Smart Key - Style 2 - Any Button Configuration|10|
CDJ.1|Chrysler/Dodge/RAM/Jeep FOBIK - White Sticker - Any Button Configuration|40|
CDJ.2|Chrysler/Dodge/RAM/Jeep FOBIK FCC ID: IYZ-C01C - Any Button Configuration|15|
CDJ.3|JEEP Logo FOBIK 3 Button FCC ID: GQ4-53T|9|
CDJ.4|JEEP Logo FOBIK Remote Start FCC ID: GQ4-53T|9|
CDJ.5|RAM Logo FOBIK 3 Button FCC ID: GQ4-53T|9|
CDJ.6|RAM Logo FOBIK Remote Start FCC ID: GQ4-53T|9|
CDJ7|Dodge FOBIK FCC ID: M3N32297100 - Any Button Configuration|9|
CDJ.8|Chrysler/Dodge/Jeep Remote Head Key - Any Button Configuration|3|
CDJ.9|Jeep Logo Remote - Front Jeep Logo - Black or Gray|0.1|
CDJ.10|Dodge Remote - Any Button Configuration|0.1|
CHR.1|Chrysler Smart Key 5 Button|10|
CHR.2|Chrysler Smart Key 4 Button|10|
CHR.3|Chrysler Smart Key - Any Button Configuration Except 7 Button|10|
CHR.4/CHR.4W|Chrysler Smart Key - 7 Button|5|1
DDG.1|Dodge Smart Key 3 Button|10|
DDG.2|Dodge Smart Key 5 Button - SUV or Sedan|10|
DDG.3|Dodge Smart Key 4 Button Remote Start|10|
DDG.4|Dodge Smart Key 4 Button Sedan|10|
RAM.1/RAM.1W|RAM Smart Key FCC ID: GQ4-76T - No Red Flash when Buttons are Pressed - Any Logo/Button Config Except RAM.1.5|25|1
RAM.1.5/RAM.1.5W|RAM Smart Key FCC ID: GQ4-76T - No Red Flash - 3 Button Black Sides|5|1
RAM.2/RAM.2W|RAM Smart Key FCC ID: OHT-4882056 - Red Flash when Buttons are Pressed - Any Logo/Button Config|8|2
RAM.3|RAM Smart Key 5 Button FCC ID: GQ4-54T|12|
RAM.4|RAM Smart Key 3 Button FCC ID: GQ4-54T|12|
RAM.5|RAM Smart Key 4 Button FCC ID: GQ4-54T|12|
RAM.6|RAM Flip Key|1|
FIA.1|FIAT Smart Key|20|5
FRD.1/FRD.1W|Ford Smart Key FCC ID: M3N5WY8406|40|20
FRD.2|Ford Smart Key - Ford Logo - Tailgate Button|25|
FRD.3|Ford Smart Key - Ford Logo - Trunk Button|25|
FRD.3.5|Ford Smart Key - Ford Logo - 4 Button|25|
FRD.4|Mustang Smart Key - Mustang Logo - Any Button Configuration|25|
FRD.5|Ford Smart Key FCC ID: M3N5WY8609 - 5 Button - MUST BE Part # CJ5T-15K601|45|
FRD.6|Ford Smart Key FCC ID: M3N5WY8609 - 5 Button - Part # BT4T-15K601|15|
FRD.6.5|Ford Smart Key FCC ID: M3N5WY8609 - 4 Button|15|
FRD.7|Ford Smart Key - Ford Logo - Any Button Configuration|10|
FRD.7.1|Bronco Smart Key - Bronco Logo - Any Button Configuration|10|
FRD.7.2|Ford ST Smart Key - ST Logo - Any Button Configuration|10|
FRD.7.3|Raptor Smart Key - Raptor Logo - Any Button Configuration|10|
FRD.7.4|Mustang Smart Key - Mustang Logo - Any Button Configuration|10|
FRD.8/FRD.8W|Ford Smart Key 3 Button|10|2
FRD.9|Ford Smart Key FCC ID: KR5876268|15|
FRD.10|Ford Smart Key FCC ID: KR55WK48801|15|
FRD.11|Ford Flip Key Remote Start Button|15|5
FRD.12/FRD.12W|Ford Flip Key Sedan Button|5|2
FRD.13/FRD.13W|Ford Flip Key 3 Button|5|2
FRD.14|Ford Remote Head Key|7|
FRD.14.5|Ford Remote Head Key|7|
FRD.15|Ford Remote Head Key FCC ID: CWTWB1U793 - 5 Button|40|
FRD.15.1|Ford Remote Head Key FCC ID: CWTWB1U793 - 4 Button Sedan|13|
FRD.15.2|Ford Remote Head Key FCC ID: CWTWB1U793 - 4 Button Remote Start|40|
FRD.15.3/FRD.15.3W|Ford Remote Head Key FCC ID: CWTWB1U793 - 3 Button|11|4
FRD.16|Ford Remote Head Key - Thin High Security Blade - 3 Button or 4 Button Sedan|1|
FRD.16.5|Ford Remote Head Key - Thin High Security Blade - Transit Button|7|
FRD.17|Ford/Lincoln/Mercury/Mazda Remote Head Key - Any Button Config - HA Stamp|1|
FRD.17.5|Ford/Lincoln/Mercury/Mazda Remote Head Key - Any Button Config - No HA Stamp|0.1|
FRD.18|Ford Remote - Any Button Configuration|0.1|
FRD.19|Ford Flip Key Transit 4 Button|5|
LIN.1/LIN.1W|Lincoln Smart Key FCC ID: M3N5WY8406|50|25
LIN.2|Lincoln Smart Key 5 Button - Lincoln Logo|25|
LIN.3|Lincoln Smart Key 4 Button - Lincoln Logo|25|
LIN.4|Lincoln Smart Key FCC ID: M3N5WY8609|20|
LIN.5|Lincoln Smart Key - Any Button Configuration|25|
HON.1|Honda Smart Key - Any Button Configuration Except HON.1.5|10|
HON.1.5|Honda Smart Key - 4 Button Sedan HOLD|10|
HON.2|Honda Remote Head Key -Style 1 - Any Button Configuration|8|
HON.3|Honda Remote Head Key - Style 2 - Any Button Configuration|4|
HON.4|Honda Smart Key - Style 2 - Any Button Configuration|13|
HYU.1/HYU.1W|Hyundai Smart Key FCC ID: SY5DMFNA04 - SUV Button - Hyundai Logo|25|25
HYU.2/HYU.2W|Hyundai Smart Key FCC ID: SY5DMFNA433 - SUV Button - Hyundai Logo|25|10
HYU.3|Equus Smart Key - Equus Logo|15|
HYU.4|Genesis Smart Key - Genesis Logo|15|
HYU.5/HYU.5W|Hyundai Smart Key - Style 1 - Sedan Button|10|3
HYU.6/HYU.6W|Hyundai Smart Key - Style 1 - SUV Button|10|3
HYU.7/HYU.7W|Hyundai Smart Key - Any Button Configuration - Style 2|8|1
HYU.8/HYU.8W|Hyundai Flip Key - Style 2 - Any Button Configuration|10|2
HYU.9/HYU.9W|Hyundai Flip Key - Style 1 - SUV or Sedan Button|8|2
HYU.10|Genesis Smart Key|8|
HYU.11|Hyundai Smart Key FCC ID: CQOFD00120|0.1|
HYU.12/HYU.12W|Hyundai Remote - Any Button Configuration|3|0.1
HYU.13/HYU.13W|Hyundai Smart Key - Style 3 - Any Button Configuration|8|1
HYU.14/HYU.14W|Hyundai Smart Key - Style 4 - Any Button Configuration|8|1
HYU.15|Genesis Smart Key - Any Button Configuration|8|
HYU.16|Hyundai Smart Key FCC ID: TQ8-FOB-4F07|10|
HYU.17|Hyundai Smart Key FCC ID: TQ8-FOB-4F11|10|
HYU.18|Genesis Smart Key - Black or White|10|
INF.1/INF.1W|Infiniti Smart Key FCC ID: KBRASTU13|30|10
INF.N001/INF.N001W|Infiniti Smart Key FCC ID: KBRTN001|20|5
INF.U787|Infiniti Smart Key SUV Button FCC ID: CWTWB1U787|15|
INF.U787.5|Infiniti Smart Key Trunk Button FCC ID: CWTWB1U787|15|
INF.8903/INF.8903W|Infiniti Smart Key FCC ID: KR55WK48903|10|3
INF.4203|Infiniti Smart Key FCC ID: KR5S180144203|15|
INF.4204|Infiniti Smart Key FCC ID: KR5S180144204|15|
INF.G744|Infiniti Smart Key FCC ID: CWTWB1G744|33|
INF.4014|Infiniti Smart Key FCC ID: KR5S180144014 - Any Button Configuration|8|
JAG.1/JAG.1W|Jaguar Smart Key|20|5
JAG.2/JAG.2W|Jaguar Smart Key FCC ID: KOBJTF10A|13|3
JAG.3/JAG.3W|Jaguar Smart Key|20|3
JAG.4|Jaguar Smart Key FCC ID: K0BJTF18A|25|
JAG.5|Jaguar Flip Key|1|
JEP.1|Jeep Smart Key 3 Button FCC ID: GQ4-54T|10|
JEP.2|Jeep Smart Key 4 Button Remote Start FCC ID: GQ4-54T|10|
JEP.3/JEP.3W|Jeep Smart Key - Must Have Line on Back - Any Button Configuration|8|2
JEP.4|Jeep Smart Key 5 Button FCC ID: GQ4-54T|15|
JEP.5|Jeep Smart Key 3 Button|10|
JEP.6|Jeep Smart Key 5 Button|10|
JEP.7|Jeep Smart Key - Style 2 - Any Button Configuration|8|
JEP.8|Jeep Flip Key FCC ID: OHT1130261 - No Buttons|10|
JEP.8.1|Jeep Flip Key FCC ID: OHT1130261 - 3 Button|5|
JEP.8.2|Jeep Flip Key FCC ID: OHT1130261 - 4 Button|5|
KIA.1/KIA.1W|Kia Flip Key FCC ID: NYOSEKSAM11ATX|15|5
KIA.2/KIA.2W|Kia Smart Key FCC ID: SY5KHFNA04|20|2
KIA.3/KIA.3W|Kia Smart Key FCC ID: SY5KHFNA433|20|2
KIA.4/KIA.4W|Kia Smart Key SUV Button FCC ID: SY5XMFNA433|20|5
KIA.5/KIA.5W|Kia Smart Key Sedan Button FCC ID: SY5XMFNA433|20|5
KIA.6/KIA.6W|Kia Smart Key SUV Button FCC ID: SY5XMFNA04|20|5
KIA.7/KIA.7W|Kia Smart Key Sedan Button FCC ID: SY5XMFNA04|20|5
KIA.8/KIA.8W|Kia Smart Key - Style 1 - Sedan Button|10|3
KIA.9/KIA.9W|Kia Smart Key - Style 1 - SUV Button|10|3
KIA.10/KIA.10W|Kia Smart Key - Style 2 - Any Button Configuration|10|2
KIA.11/KIA.11W|Kia Smart Key 6 Button|10|2
KIA.12/KIA.12W|Kia Flip Key - Any Button Configuration - Style 2 - All Except KIA.12.5|10|1
KIA.12.5/KIA.12.5W|Kia Flip Key - Style 2 - New Kia Logo Sedan Button Part # M6500|5|1
KIA.13/KIA.13W|Kia Flip Key FCC ID: TQ8-RKE- 3F02|15|5
KIA.14/KIA.14W|Kia Flip Key - Any Button Configuration - Style 1|5|2
KIA.15/KIA.15W|Kia Remote|3|0.1
KIA.16|Kia Smart Key FCC ID: TQ8-FOB-4F06|10|
KIA.17|Kia Smart Key FCC ID: TQ8-FOB-4F08|10|
KIA.18|Kia Smart Key - Style 3 - Any Button Configuration|10|
LR.1/LR.1W|Land Rover Range Rover Smart Key FCC ID: KOBJTF10A|13|3
LR.1.5/LR.1.5W|Land Rover Smart Key FCC ID: KOBJTF10A|13|3
LR.2|Land Rover Smart Key FCC ID: K0BJXF18A|25|
LEX.1|Lexus Smart Key FCC ID: HYQ14FBB|20|
LEX.2|Lexus Smart Key SUV Button FCC ID: HYQ14FBA|15|
LEX.3|Lexus Smart Key Sedan Button FCC ID: HYQ14FBA|35|
LEX.4|Lexus Smart Key - Any Button Configuration - FCC ID: HYQ14ACX or HYQ14AAB or HYQ14AEM|25|
LEX.5/LEX.5W|Lexus Smart Key Card - Any FCC ID|10|5
LEX.6|Lexus Smart Key - Any Button Configuration - FCC ID: HYQ14FBF|5|
LEX.7|Lexus Remote Head Key - Any Button Configuration|15|
LEX.8/LEX.8W|Lexus Smart Key FCC ID: HYQ12BZE - 2 or 3 Button|10|2
LEX.9|Lexus Smart Key - FCC ID: HYQ14FLB (chip must read A9)|50|
LEX.9.5|Lexus Smart Key - FCC ID: HYQ14FLB (chip reads AA)|10|
MAZ.1/MAZ.1W|Mazda Smart Key - Any Button Configuration - FCC ID: WAZX1T763SKE11A04|40|20
MAZ.2/MAZ.2W|Mazda Smart Key - Any Button Configuration - FCC ID: WAZX1T768SKE11A03|40|20
MAZ.3/MAZ.3W|Mazda Smart Key - Any Button Configuration - FCC ID: WAZSKE11D01 or WAZSKE13D03|10|3
MAZ.4/MAZ.4W|Mazda Smart Card Key - Any Button Configuration|30|10
MAZ.5/MAZ.5W|Mazda Smart Key FCC ID: KR55WK49383|40|20
MAZ.6/MAZ.6W|Mazda Smart Key - Any Button Configuration - FCC ID: WAZSKE13D01 or WAZSKE13D02|15|10
MAZ.7/MAZ.7W|Mazda Flip Key - Any Button Configuration|3|1
MB.1|Mercedes-Benz Smart Key FCC ID: KR55WK49046|3|
MB.2|Mercedes-Benz Smart Key FCC ID: KR55WK49031|3|
MB.3|Mercedes-Benz Smart Key FCC ID: IYZ3317|3|
MB.4|Mercedes-Benz Smart Key FCC ID: IYZ 3312|3|
MB.5|Mercedes-Benz Key Triangle Panic Button|1|
MB.6|Mercedes-Benz Smart Key - Style 1|1|
MB.7|Mercedes-Benz Smart Key - Style 2|3|
MIT.1/MIT.1W|Mitsubishi Smart Key FCC ID: OUC644M-KEY-N - Any Button Configuration|10|2
MIT.2|Mitsubishi Smart Key FCC ID: OUC003M - Any Button Configuration|10|
MIT.3|Mitsubishi Remote Head Key - Any Button Configuration|10|
MIT.4|Mitsubishi Remote Head Key - Any Button Configuration|3|
MIT.5|Mitsubishi Smart Key - Style 2|20|
MIT.6|Mitsubishi Smart Key - Style 3 - Any Button Configuration|7|
MIT.7|Mitsubishi Smart Key FCC ID: OUCGHR-M013 - Any Button Configuration|10|
NIS.GTR|Nissan Smart Key GT-R Logo FCC ID: KR55WK49622|40|
NIS.N001/NIS.N001W|Nissan Smart Key FCC ID: KBRTN001|20|10
NIS.U789/NIS.U789W|Nissan Smart Key 6 Button FCC ID: CWTWB1U789|35|10
NIS.9622|Nissan Smart Key 3 Button FCC ID: KR55WK49622|13|
NIS.9622.5|Nissan Smart Key SUV 4 Button FCC ID: KR55WK49622|10|
NIS.4014.1|Nissan Smart Key FCC ID: KR5S180144014 - 44021|13|
NIS.4014.2|Nissan Smart Key FCC ID: KR5S180144014 - 44008|13|
NIS.4014.3|Nissan Smart Key FCC ID: KR5S180144014 - 4018|10|
NIS.4014.4|Nissan Smart Key FCC ID: KR5S180144014 - 4324|10|
NIS.4014.5|Nissan Smart Key FCC ID: KR5S180144014 - 4304|10|
NIS.Z|Nissan Smart Key Z Logo FCC ID: KR55WK49622|25|
NIS.U840.5|Nissan Smart Key Electric PLUG IN Button FCC ID: CWTWB1U840|2|
NIS.G744|Nissan Smart Key FCC ID: CWTWB1G744|20|
NIS.U808|Nissan Smart Key FCC ID: CWTWB1U808|20|
NIS.4016.1|Nissan Smart Key FCC ID: KR5S180144016|10|
NIS.4016.3|Nissan Smart Key FCC ID: KR5S180144016|10|
NIS.4016.2|Nissan Smart Key FCC ID: KR5S180144016|5|
NIS.U729|Nissan Smart Key FCC ID: CWTWBU729|10|
NIS.U735|Nissan Smart Key FCC ID: CWTWBU735|5|
NIS.8903/NIS.8903W|Nissan Smart Key FCC ID: KR5SWK48903|10|3
NIS.4014.6|Nissan Smart Key FCC ID: KR5S180144014 - 44005|10|
NIS.4014.7|Nissan Smart Key Trunk 5 Button FCC ID: KR5S180144014 - 44020|10|
NIS.4014.25|Nissan Smart Key SUV 5 Button FCC ID: KR5S180144014 - 44308|10|
NIS.4014.15|Nissan Smart Key FCC ID: KR5S180144014 - 44306 or 44313|5|
NIS.U840|Nissan Smart Key Sedan Button FCC ID: CWTWB1U840|5|
NIS.4014.75|Nissan Smart Key Trunk 5 Button FCC ID: KR5S180144014 - 4310|5|
NIS.10|Nissan Smart Key - Red Flash When Button is Pressed - FCC ID begins with KR5TXN - Any Button Config|5|
NIS.6|Nissan Smart Key - Style 2 - Any Button Configuration|5|
NIS.11|Nissan Remote Head Key 4 Button FCC ID: CWTWB1U751|0.1|
NIS.11.5|Nissan Remote Head Key 3 Button FCC ID: CWTWB1U751|0.1|
NIS.12|Nissan Flip Key|1|
NIS.13|Nissan Remote - Any FCC ID - Any Button Configuration|0.25|
POR.1|Porsche Smart Key - Any Button Configuration|5|
SCI.1|Scion Smart Key FCC ID: HYQ14ACX - 3 or 4 Button|25|
SUB.1|Subaru Smart Key FCC ID: HYQ14AGX|45|
SUB.2|Subaru Smart Key FCC ID: HYQ14ACX - Logo May be Black or Colored|40|
SUB.3/SUB.3W|Subaru Smart Key FCC ID: HYQ14AHC|20|5
SUB.4/SUB.4W|Subaru Smart Key FCC ID: HYQ14AHK|30|10
SUB.4.5/SUB.4.5W|Subaru Smart Key FCC ID: HYQ14AKB|20|5
SUB.5|Subaru Remote Head Key FCC ID: CWTWBU811 - Not Security Thin Blade|3|
SUB.5.5|Subaru Remote Head Key FCC ID: CWTWBU811 - Security Thin Blade|3|
SUB.6|Subaru Remote Head Key FCC ID: CWTB1G077|25|
SUB.7|Subaru Remote Head Key FCC ID: CWTWBU766|5|
SUB.8|Subaru Remote Head Key FCC ID: CWTWBU745|2|
SUB.9|Subaru Remote - 3 or 4 Button - Style 1|1|
SUB.10|Subaru Remote - Style 2|1|
SUZ.1|Suzuki Smart Key FCC ID: KBRTS009|25|
TOY.1|Toyota Smart Key SUV Button FCC ID: HYQ14FBA Board # 2110|20|
TOY.1.5|Toyota Smart Key SUV Button FCC ID: HYQ14FBA Board # 0020|25|
TOY.2|Toyota Smart Key 4 Button Sedan FCC ID: HYQ14FBA|25|
TOY.3|Toyota Smart Key FCC ID: HYQ14ADR|60|
TOY.4|Toyota Smart Key FCC ID: HYQ14AAF|40|10
TOY.5|Toyota Smart Key 4 Button FCC ID: HYQ14AEM|30|
TOY.6|Toyota Smart Key A/C Button FCC ID: HYQ14ACX|25|
TOY.7|Toyota Smart Key 3 Button FCC ID: HYQ14FBA Board # 0020|40|
TOY.7.5|Toyota Smart Key 3 Button FCC ID: HYQ14FBA Board # 2110|15|
TOY.8|Toyota Smart Key 3 Button FCC ID: HYQ14FBB|5|
TOY.9|Toyota Smart Key 4 Button Hatch FCC ID: HYQ14ACX|20|
TOY.10|Toyota Smart Key 4 Button Hatch FCC ID: HYQ14AAB|20|
TOY.11|Toyota Smart Key FCC ID: HYQ14AAB|20|
TOY.12|Toyota Smart Key - Toyota Logo - FCC ID: WAZSKE13D01|25|10
TOY.12.5|Toyota Smart Key - Toyota Logo - FCC ID: WAZSKE13D02|25|10
TOY.13|Toyota Smart Key FCC ID: HYQ14FBE or HYQ14FLA - Prius Prime Logo|30|
TOY.13.1|Toyota Smart Key FCC ID: HYQ14FBN 3 Button - Corolla Logo|15|
TOY.13.2|Toyota Smart Key FCC ID: HYQ14FBN 4 Button - Corolla Logo|15|
TOY.13.3|Toyota Smart Key FCC ID: HYQ14FBC - Prius Logo|15|
TOY.13.4|Toyota Smart Key FCC ID: M0ZBR1ET - C-HR Logo|45|
TOY.13.5|Toyota Smart Key FCC ID: HYQ14FBC - Camry Logo|10|
TOY.13.6|Toyota Smart Key FCC ID: HYQ14FBC/HYQ14FBE - Avalon Logo|3|
TOY.13.7|Toyota Smart Key FCC ID: HYQ14FBC/HYQ14FLA - 3 Button - RAV4 Logo|3|
TOY.13.8|Toyota Smart Key FCC ID: HYQ14FBC/HYQ14FLA - 4 Button - RAV4 Logo|3|
TOY.13.9|Toyota Smart Key FCC ID: HYQ14FBC/HYQ14FLA - 3 or 4 Button - Highlander Logo|3|
TOY.14|Toyota Smart Key FCC ID: HYQ14FLA - Camry Logo|10|
TOY.15|Toyota Remote Head Key SUV Button FCC ID: HYQ12BDM|30|
TOY.16/TOY.16W|Toyota Smart Key FCC ID: MOZB31EG - Silver or Black Logo|30|10
TOY.17/TOY.17W|Toyota Flip Key 3 Button - Any FCC ID|14|3
TOY.18|Toyota Remote Head Key FCC ID: HYQ12BBT or HYQ1512V|20|
TOY.19|Toyota Remote Head Key 4 Button SUV - FCC ID: GQ4-52T|25|
TOY.20|Toyota Remote Head Key 3 Button - FCC ID: GQ4-52T|7|
TOY.21|Toyota Remote Head Key 3 Button - FCC ID: HYQ12BDM/HYQ12BDP/HYQ12BGG|7|
TOY.22/TOY.22W|Toyota Flip Key 4 Button|3|1
TOY.23|Toyota Remote Head Key - Any Button Configuration|4|
TOY.24|Toyota Remote Head Key Sedan Button FCC ID: HYQ12BDM or HYQ12BEL - H on Blade|5|
TOY.25|Toyota Remote Head Key Sedan Button FCC ID: HYQ12BDM - G on Blade|5|
TOY.26|Toyota Remote FCC ID: GQ43VT20T - Any Button Configuration|4|
TOY.27|Toyota Remote - Any FCC ID - Any Button Configuration|1|
TOY.28|Toyota Smart Key - Style 2 - Any FCC ID - Any Button Configuration|7|
TOY.29|Toyota Smart Key 3 Button - FCC ID: HYQ14ACX|20|
TOY.30|Toyota Smart Key - FCC ID: N5F-ID21A|3|
VW.1|Volkswagen Key|1|
VW.2|Volkswagen Key - Any Button Configuration|0.1|
VW.3|Volkswagen Flip Key|0.1|
VW.4|Volkswagen Flip Key - Style 2|0.1|
VVO.1|Volvo Smart Key 5 Button|3|
VVO.2|Volvo Smart Key 6 Button|3|
VVO.3/VVO.3W|Volvo Smart Key - Style 2 - Any Color|10|1
`;

export const priceCatalog: PriceCatalogItem[] = rawPriceCatalog
	.trim()
	.split("\n")
	.map((line) => {
		const [sku, description, price, wornPrice] = line.split("|");
		const prefix = sku.split(".")[0];

		return {
			sku,
			description,
			price: Number(price),
			wornPrice: wornPrice ? Number(wornPrice) : null,
			make: makeByPrefix[prefix] ?? description.split(" ")[0],
		};
	});

export const priceCatalogMakes = [...new Set(priceCatalog.map((item) => item.make))].sort((a, b) =>
	a.localeCompare(b)
);
