function intersect(array1, array2) {
	return array1.filter(function(n) {
	    return array2.indexOf(n) != -1;
	});
}

function subset(subarray, superarray) {
	return subarray.reduce(function(o, k) { o[k] = superarray[k]; return o; }, {});
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

	create_table(name, fields) {
		this.tables[name] = new Table(name, fields);
	}

}

class Table {

	constructor(name, fields) {
		this.name = name;
		this.fields = fields;
		this.data = [];
	}

	insert(json) {
		this.data.push(json);
	}

	update(fields, where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace(key, "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				Object.assign(this.data[i], fields);
			}
		}
	}

	delete(where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace(key, "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				this.data.splice(i, 1);
			}
		}
	}

	select(fields, where) {
		var i = 0;
		var results = [];
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace(key, "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				var result = {};
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
test.update({"id":"2", "name":"Tony"}, 'loghome', 'id == 1');
// test.delete('loghome', 'id == 1');
test2 = test.select(["id"], 'loghome', 'id == 2');
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
