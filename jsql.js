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
		   		if (!dict.hasOwnProperty(key)) {
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
		this.foreign_keys = [];
	}

	insert(rows, table) {
		var table = this.tables[table];
		table.insert(rows);
		this.verify_foreign_keys();
	}

	update(fields, table, where) {
		var table = this.tables[table];
		table.update(fields, where);
		this.verify_foreign_keys();
	}

	delete(table, where) {
		var table = this.tables[table];
		table.delete(where);
		this.verify_foreign_keys();
	}

	select(fields, tables, where) {
		var i = 0;
		var queryset = [];
		for (i = 0; i < tables.length; i++) {
			var name = tables[i]['name'];
			var on = tables[i]['on'];
			var table = this.tables[name];
			var condition = on.replace(/`(\w+)`\.`(\w+)`/g, "this.tables['$1']['$2']");
			if (eval(condition)) {
				// This needs work.  Should use Object.assign somewhere to combine the objects in each row.
				queryset = queryset.concat(table.select(fields, where));
			}
		}
		return queryset;
	}

	create_table(name, structure) {
		this.tables[name] = new Table(name, structure);
		this.foreign_keys = this.foreign_keys.concat(this.tables[name].foreign_keys);
	}

	verify_foreign_keys() {
		var i = 0;
		var foreign_keys = this.foreign_keys;
		var tables = this.tables;
		for (i = 0; i < foreign_keys.length; i++) {
			var foreign_key = foreign_keys[i];
			var values = tables[foreign_key["table"]].indices[foreign_key["field"]];
			if (!values) {
				continue;
			}
			values.every(function(value) {
				if (!tables.hasOwnProperty(foreign_key["target_table"]) || !tables[foreign_key["target_table"]].indices.hasOwnProperty(foreign_key["target_field"]) || tables[foreign_key["target_table"]].indices[foreign_key["target_field"]].indexOf(value) == -1) {
					throw new Error("Foreign key constraint.  The field "+foreign_key["table"]+"."+foreign_key["field"]+" is linked to "+foreign_key["target_table"]+"."+foreign_key["target_field"]+".  This constraint is being violated where the former equals "+value+".  The latter contains no such value.");
				}
			});			
		}
	}

}

class Table {

	constructor(name, structure) {
		this.name = name;
		this.structure = structure;
		this.data = [];
		this.indices = {};
		this.foreign_keys = [];
		var self = this;
		var keys = Object.keys(structure);
		keys.forEach(function(key) {
			if (structure[key].constructor.name == 'ForeignKeyField') {
				var target = structure[key].target;
				var target = target.replace('`.`', '`');
				var target_table = target.split("`")[1];
				var target_field = target.split("`")[2];
				self.foreign_keys.push({"table": name, "field": key, "target_table": target_table, "target_field": target_field});
			}
		});
	}

	index() {
		this.indices = transpose(this.data);
	}

	insert(rows) {
		var i = 0;
		for (i = 0; i < rows.length; i++) {
			var json = rows[i];
			var keys = Object.keys(json);
			var structure = this.structure;
			var structure_keys = Object.keys(structure);
			var indices = this.indices;
			keys.forEach(function(key) {
				if (!structure[key].validate(json[key])) {
					throw new Error("Invalid data type.");
				}
				if (structure[key].unique) {
					if (indices && indices.hasOwnProperty(key) && indices[key].indexOf(json[key]) > -1) {
						throw new Error(key+"' field is unique.  Cannot add duplicate value "+json[key]);
					}
				}
			});
			structure_keys.forEach(function(key) {
				if (structure[key].constructor.name == 'AutoField' && !json.hasOwnProperty(key)) {
					var values = indices[key];
					values.push(structure[key].counter);
					var next = Math.max.apply(Math, values) + 1;
					json[key] = next;
					structure[key].counter = next;
				}
				if (!json.hasOwnProperty(key) && structure[key].defaul) {
					json[key] = structure[key].defaul;
				}
				else if (!json.hasOwnProperty(key) && structure[key].blank) {
					json[key] = null;
				}
				else if (!json.hasOwnProperty(key) && !structure[key].blank && !structure[key].defaul) {
					throw new Error(key+" is a required field.");
				}
			});
			this.data.push(json);
			this.index();
		}
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

class Field {

	constructor(max_length = false, unique=false, blank=true, defaul=false) {
		if (max_length) {
			this.max_length = max_length;
		} 
		if (unique) {
			this.unique = true;
		}
		if (blank) {
			this.blank = true;
		}
		if (defaul) {
			this.defaul = defaul;
		}
		if (!this.defaul && !this.blank) {
			throw new Error("Required fields must have a default value.");
		}
	}

	validate(value) {
		if (value.length > this.max_length) {
			throw new Error(value+"' is greater than '"+this.max_length+"' characters.");
		}
		return true;
	}

}

class CharField extends Field {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		if (typeof value !== 'string') {
			throw new Error(value+"' is not a string.");
		}
		return true;
	}

}

class FloatField extends Field {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		return true;
	}

}

class IntegerField extends FloatField {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		if (!Number.isInteger(value)) {
			throw new Error(value+"' is not an integer.");
		}
		return true;
	}

}

class EmailField extends CharField {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		var re = /^.+@.+$/;
		if (!re.test(value)) {
			throw new Error(value+"' is not an email address.");
		}
		return true;
	}

}

class UrlField extends CharField {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		var re = /^https?:\/\/.+\..+$/;
		if (!re.test(value)) {
			throw new Error(value+"' is not a url.");
		}
		return true;
	}

}

class ForeignKeyField extends IntegerField {

	constructor(target, max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
		this.target = target;
	}

	validate(value) {
		super.validate(value);
		return true;
	}

}

class BooleanField extends IntegerField {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		if (typeof value !== 'boolean') {
			throw new Error(value+" is not a boolean.");
		}
		return true;
	}

}

class AutoField extends IntegerField {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
		this.counter = 0;
	}

	validate(value) {
		super.validate(value);
		return true;
	}

}

class SlugField extends CharField {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		var re = /^[\w\d_-]*$/;
		if (!re.test(value)) {
			throw new Error(value+"' is not a slug.");
		}
		return true;
	}

}

class PositiveIntegerField extends IntegerField {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		if (value < 0) {
			throw new Error(value+" is not positive.");
		}
		return true;
	}

}

class DateTimeField extends Field {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		if (!value instanceof Date) {
			throw new Exception(value+" is not a datetime.");
		}
		return true;
	}

}

class DecimalField extends FloatField {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		var num = float(value.toFixed(2));
		if (value !== num) {
			throw new Error(value+" is not a decimal.");
		}
		return true;
	}

}



var test = new Database();
test.create_table(name='test', structure={
		'id': new AutoField(max_length=false, unique=true),
		'name': new CharField(),
	}
);
test.create_table(name='floorplan', structure={
		'id': new IntegerField(max_length=false, unique=true),
	}
);
test.insert(rows=[{"id": 0}], table='test');
test.insert(rows=[{"name":"Bob"}], table='test');
test.insert(rows=[{"name":"Sam"}], table='test');
// test.update(fields={"name":"Tony", "floorplan": 1}, table='test', where='`id` == 1');
test2 = test.select(fields=["id", "name"], tables=[{'name':'test', 'on':'true'}], where='true');
console.log(test2);
