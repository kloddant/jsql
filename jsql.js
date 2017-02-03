function intersect(array1, array2) {
	return array1.filter(function(n) {
	    return array2.indexOf(n) != -1;
	});
}

function subset(subarray, superarray) {
	return subarray.reduce(function(o, k) { o[k] = superarray[k]; return o; }, {});
}

function transpose(array) {
	var i = 0;
	var dict = {};
	for (i = 0; i < array.length; i++) {
		for (var key in array[i]) {
		   if (array[i].hasOwnProperty(key)) {
		   		if (i == 0) {
		   			dict[key] = [];
		   		}
		   		dict[key].push(array[i][key]);
		   }
		}
	}
	return dict;
}

function exit(error) {
	throw new Error(error);
}

class Database {

	constructor() {
		this.tables = {};
	}

	insert(json, table) {
		var table = this.tables[table];
		table.insert(json);
	}

	update(fields, table, where) {
		var table = this.tables[table];
		table.update(fields, where);
	}

	delete(table, where) {
		var table = this.tables[table];
		table.delete(where);
	}

	select(fields, table, where) {
		var table = this.tables[table];
		return table.select(fields, where);
	}

	create_table(name, structure) {
		this.tables[name] = new Table(name, structure);
	}

}

class Table {

	constructor(name, structure) {
		this.name = name;
		this.structure = structure;
		this.data = [];
		this.indices = {};
	}

	index() {
		this.indices = transpose(this.data);
	}

	insert(json) {
		this.data.push(json);
		this.index();
	}

	update(fields, where) {
		this.indexed_update(fields, where);
	}

	delete(where) {
		this.indexed_delete(where);
	}

	select(fields, where) {
		return this.indexed_select(fields, where);
	}

	indexed_update(fields, where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			condition = condition.replace(/`(\w+)`/g, "this.indices['$1'][i]");
			if (eval(condition)) {
				Object.assign(this.data[i], fields);
			}
		}
		this.index();
	}

	indexed_delete(where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			condition = condition.replace(/`(\w+)`/g, "this.indices['$1'][i]");
			if (eval(condition)) {
				this.data.splice(i, 1);
			}
		}
		this.index();
	}

	indexed_select(fields, where) {
		var i = 0;
		var results = [];
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			condition = condition.replace(/`(\w+)`/g, "this.indices['$1'][i]");
			if (eval(condition)) {
				var sub = {};
				var ii = 0;
				for (ii = 0; ii < fields.length; ii++) {
					sub[fields[ii]] = this.indices[fields[ii]][i];
				}
				results.push(sub);
			}
		}
		return results;
	}

	full_scan_update(fields, where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace("`"+key+"`", "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				Object.assign(this.data[i], fields);
			}
		}
		this.index();
	}

	full_scan_delete(where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace("`"+key+"`", "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				this.data.splice(i, 1);
			}
		}
		this.index();
	}

	full_scan_select(fields, where) {
		var i = 0;
		var results = [];
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace("`"+key+"`", "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				if (intersect(fields, keys)) {
					var sub = subset(fields, this.data[i]);
					results.push(sub);
				}
			}
		}
		return results;
	}

}

var test = new Database();
test.create_table('loghome', ['id', 'name']);
test.insert({"id":"1", "name":"Bob"}, 'loghome');
test.update({"id":"2", "name":"Tony"}, 'loghome', '`id` == 1');
// test.delete('loghome', '`id` == 1');
test2 = test.select(["id"], 'loghome', '`id` == 2');
console.log(test2);

class Field {

	constructor() {

	}

}

class CharField extends Field {

	constructor() {

	}

}

class IntegerField extends Field {

	constructor() {

	}

}

class EmailField extends CharField {

	constructor() {

	}

}

class UrlField extends CharField {

	constructor() {

	}

}
