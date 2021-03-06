{
	"translatorID": "dac476e4-401d-430a-8571-a97c31c3b65e",
	"label": "Taylor and Francis+NEJM",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?(tandfonline\\.com|nejm\\.org)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-08-26 01:04:25"
}

/*
Taylor and Francis Translator
Copyright (C) 2011 Sebastian Karcher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

function getTitles(doc) {
	//Z.debug(ZU.xpath(doc, '//div[contains(@class="articleLink")]/a').length)
	return ZU.xpath(doc, '//label[@class="resultTitle"]/a\
						|//a[@class="entryTitle"]|//div[contains(@class, "articleLink")]/a');
}

function detectWeb(doc, url) {
	if (url.match(/\/doi\/abs\/10\.|\/doi\/full\/10\./)) {
		return "journalArticle";
	} else if(url.match(/\/action\/doSearch\?|\/toc\//) &&
		getTitles(doc).length) {
		return "multiple";
	}
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = getTitles(doc);
		var doi;
		for(var i=0, n=titles.length; i<n; i++) {
			doi = titles[i].href.match(/\/doi\/(?:abs|full)\/(10\.[^?#]+)/);
			if(doi) {
				items[doi[1]] = titles[i].textContent;
			}
		}

		Zotero.selectItems(items, function(selectedItems){
			if(!selectedItems) return true;
			
			var dois = new Array();
			for (var i in selectedItems) {
				dois.push(i);
			}
			scrape(null, url,dois);
		});
	} else {
		var doi = url.match(/\/doi\/(?:abs|full)\/(10\.[^?#]+)/);
		scrape(doc, url,[doi[1]]);
	}
}

function finalizeItem(item, doc, doi, baseUrl) {
	var pdfurl = baseUrl + '/doi/pdf/';
	var absurl = baseUrl + '/doi/abs/';

	//add attachments
	item.attachments = [{
		title: 'Full Text PDF',
		url: pdfurl + doi,
		mimeType: 'application/pdf'
	}];
	if(doc) {
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
	} else {
		item.attachments.push({
			title: 'Snapshot',
			url: item.url || absurl + doi,
			mimeType: 'text/html'
		});
	}

	item.complete();
}

function scrape(doc, url, dois) {
	var baseUrl = url.match(/https?:\/\/[^\/]+/)[0]
	var postUrl = baseUrl + '/action/downloadCitation';
	var postBody = 	'downloadFileName=citation&' +
					'direct=true&' +
					'include=abs&' +
					'doi=';
	var risFormat = '&format=ris';
	var bibtexFormat = '&format=bibtex';

	for(var i=0, n=dois.length; i<n; i++) {
		(function(doi) {
			ZU.doPost(postUrl, postBody + doi + bibtexFormat, function(text) {
				var translator = Zotero.loadTranslator("import");
				// Use BibTeX translator
				translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
				translator.setString(text);
				translator.setHandler("itemDone", function(obj, item) {
					// BibTeX content can have HTML entities (e.g. &amp;) in various fields
					// We'll just try to unescape the most likely fields to contain these entities
					// Note that RIS data is not always correct, so we avoid using it
					var unescapeFields = ['title', 'publicationTitle', 'abstractNote'];
					for(var i=0; i<unescapeFields.length; i++) {
						if(item[unescapeFields[i]]) {
							item[unescapeFields[i]] = ZU.unescapeHTML(item[unescapeFields[i]]);
						}
					}
					
					item.bookTitle = item.publicationTitle;

					//unfortunately, bibtex is missing some data
					//publisher, ISSN/ISBN
					ZU.doPost(postUrl, postBody + doi + risFormat, function(text) {
						risTrans = Zotero.loadTranslator("import");
						risTrans.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
						risTrans.setString(text);
						risTrans.setHandler("itemDone", function(obj, risItem) {
							if(!item.title) item.title = "<no title>";	//RIS title can be even worse, it actually says "null"
							if(risItem.date) item.date = risItem.date; // More complete
							item.publisher = risItem.publisher;
							item.ISSN = risItem.ISSN;
							item.ISBN = risItem.ISBN;
							//clean up abstract removing Abstract:, Summary: or Abstract Summary:
							if (item.abstractNote) item.abstractNote = item.abstractNote.replace(/^(Abstract)?\s*(Summary)?:?\s*/i, "");
							if(item.title.toUpperCase() == item.title) {
								item.title = ZU.capitalizeTitle(item.title, true);
							}
							finalizeItem(item, doc, doi, baseUrl);
						});
						risTrans.translate();
					});
				});
				translator.translate();
			});
		})(dois[i]);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Informality and productivity in the labor market in Peru",
				"creators": [
					{
						"firstName": "Alberto",
						"lastName": "Chong",
						"creatorType": "author"
					},
					{
						"firstName": "Jose",
						"lastName": "Galdo",
						"creatorType": "author"
					},
					{
						"firstName": "Jaime",
						"lastName": "Saavedra",
						"creatorType": "author"
					}
				],
				"date": "December 1, 2008",
				"DOI": "10.1080/17487870802543480",
				"ISSN": "1748-7870",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"issue": "4",
				"itemID": "doi:10.1080/17487870802543480",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "229-245",
				"publicationTitle": "Journal of Economic Policy Reform",
				"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
				"volume": "11",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/toc/clah20/22/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/full/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Informality and productivity in the labor market in Peru",
				"creators": [
					{
						"firstName": "Alberto",
						"lastName": "Chong",
						"creatorType": "author"
					},
					{
						"firstName": "Jose",
						"lastName": "Galdo",
						"creatorType": "author"
					},
					{
						"firstName": "Jaime",
						"lastName": "Saavedra",
						"creatorType": "author"
					}
				],
				"date": "December 1, 2008",
				"DOI": "10.1080/17487870802543480",
				"ISSN": "1748-7870",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"issue": "4",
				"itemID": "doi:10.1080/17487870802543480",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "229-245",
				"publicationTitle": "Journal of Economic Policy Reform",
				"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
				"volume": "11",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/abs/10.1080/00036846.2011.568404",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Estimating willingness to pay by risk adjustment mechanism",
				"creators": [
					{
						"firstName": "Joo Heon",
						"lastName": "Park",
						"creatorType": "author"
					},
					{
						"firstName": "Douglas L.",
						"lastName": "MacLachlan",
						"creatorType": "author"
					}
				],
				"date": "September 14, 2011",
				"DOI": "10.1080/00036846.2011.568404",
				"ISSN": "0003-6846",
				"abstractNote": "Measuring consumers’ Willingness To Pay (WTP) without considering the level of uncertainty in valuation and the consequent risk premiums will result in estimates that are biased toward lower values. This research proposes a model and method for correctly assessing WTP in cases involving valuation uncertainty. The new method, called Risk Adjustment Mechanism (RAM), is presented theoretically and demonstrated empirically. It is shown that the RAM outperforms the traditional method for assessing WTP, especially in a context of a nonmarket good such as a totally new product.",
				"issue": "1",
				"itemID": "doi:10.1080/00036846.2011.568404",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "37-46",
				"publicationTitle": "Applied Economics",
				"url": "http://www.tandfonline.com/doi/abs/10.1080/00036846.2011.568404",
				"volume": "45",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nejm.org/toc/nejm/medical-journal",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.nejm.org/doi/full/10.1056/NEJMp1207920",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cutting Family Planning in Texas",
				"creators": [
					{
						"firstName": "Kari",
						"lastName": "White",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Grossman",
						"creatorType": "author"
					},
					{
						"firstName": "Kristine",
						"lastName": "Hopkins",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph E.",
						"lastName": "Potter",
						"creatorType": "author"
					}
				],
				"date": "September 26, 2012",
				"DOI": "10.1056/NEJMp1207920",
				"ISSN": "0028-4793",
				"abstractNote": "Four fundamental principles drive public funding for family planning. First, unintended pregnancy is associated with negative health consequences, including reduced use of prenatal care, lower breast-feeding rates, and poor maternal and neonatal outcomes.1,2 Second, governments realize substantial cost savings by investing in family planning, which reduces the rate of unintended pregnancies and the costs of prenatal, delivery, postpartum, and infant care.3 Third, all Americans have the right to choose the timing and number of their children. And fourth, family planning enables women to attain their educational and career goals and families to provide for their children. These principles led . . .",
				"extra": "PMID: 23013071",
				"issue": "13",
				"itemID": "doi:10.1056/NEJMp1207920",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "1179-1181",
				"publicationTitle": "New England Journal of Medicine",
				"url": "http://www.nejm.org/doi/full/10.1056/NEJMp1207920",
				"volume": "367",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/abs/10.1080/0308106032000167373",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "<no title>",
				"creators": [
					{
						"firstName": "Milan",
						"lastName": "Janic",
						"creatorType": "author"
					}
				],
				"date": "December 1, 2003",
				"DOI": "10.1080/0308106032000167373",
				"ISSN": "0308-1060",
				"abstractNote": "This article deals with a multicriteria evaluation of High-Speed Rail, Transrapid Maglev and Air Passenger Transport in Europe. Operational, socio-economic and environmental performance indicators of the specific high-speed transport systems are adopted as the evaluation criteria. By using the entropy method, weights are assigned to particular criteria in order to indicate their relative importance in decision-making. The TOPSIS method is applied to carry out the multicriteria evaluation and selection of the preferable alternative (high-speed system) under given circumstances.",
				"issue": "6",
				"itemID": "doi:10.1080/0308106032000167373",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "491-512",
				"publicationTitle": "Transportation Planning and Technology",
				"url": "http://dx.doi.org/10.1080/0308106032000167373",
				"volume": "26",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/action/doSearch?AllField=labor+market",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/abs/10.1080/00380768.1991.10415050#.U_vX3WPATVE",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Concentration dependence of CO2 evolution from soil in chamber with low CO2 concentration (< 2,000 ppm), and CO2 diffusion/sorption model in soil",
				"creators": [
					{
						"firstName": "Takahiko",
						"lastName": "Naganawa",
						"creatorType": "author"
					},
					{
						"firstName": "Kazutake",
						"lastName": "Kyuma",
						"creatorType": "author"
					}
				],
				"date": "September 1, 1991",
				"DOI": "10.1080/00380768.1991.10415050",
				"ISSN": "0038-0768",
				"abstractNote": "Concentration dependence of CO2 evolution from soil was studied under field and laboratory conditions. Under field conditions, when the CO2 concentration was measured with an infrared gas analyzer (IRGA) in a small and column-shaped chamber placed on the ground, the relationship among the CO2 concentration c (m3 m-3), time t (h), height of the chamber h, a constant rate of CO2 evolution from the soil v (m3 m-2 h-1), and an appropriate constant k, was expressed by the following equation, d c/d t = v/ h—k(c— a) (c=a at t = 0). Although most of the data of measured CO2 evolution fitted to this equation, the applicability of the equation was limited to the data to which a linear equation could not be fitted, because the estimated value of v had a larger error than that estimated by linear regression analysis, as observed by computer simulation. The concentration dependence shown above and some other variations were analyzed based on a sorption/diffusion model, i.e. they were associated with CO2-sorption by the soil and modified by the conditions of CO2 diffusion in the soil.",
				"issue": "3",
				"itemID": "doi:10.1080/00380768.1991.10415050",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "381-386",
				"publicationTitle": "Soil Science and Plant Nutrition",
				"url": "http://dx.doi.org/10.1080/00380768.1991.10415050",
				"volume": "37",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/