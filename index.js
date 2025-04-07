import { lookupCollection, lookupCollections } from "@iconify/json";
import {
  defaultIconProps,
  iconToHTML,
  iconToSVG,
  mergeIconData,
  parseIconSet,
  replaceIDs,
} from "@iconify/utils";
import { isFunction, isPlainObject } from "es-toolkit";
import mapObject from "map-obj";
import { nanoid } from "nanoid";
import fs from "node:fs";

const dataPath = "data";

const groupCollections = (collections, [fn, ...rest]) =>
  isFunction(fn)
    ? mapObject(Object.groupBy(collections, fn), (key, value) => [
        key.replace("/", "-"),
        groupCollections(value, rest),
      ])
    : collections;

const buildData = async (groupedCollections, iconPathSegments = [dataPath]) => {
  if (isPlainObject(groupedCollections))
    return Object.fromEntries(
      await Promise.all(
        Object.entries(groupedCollections).map(async ([key, value]) => [
          key,
          await buildData(value, [...iconPathSegments, key]),
        ])
      )
    );

  await Promise.all(
    groupedCollections.map(async (iconSet) => {
      const iconPath = [...iconPathSegments, iconSet.name].join("/");

      // https://github.com/phatdev-hehe/icon-sets/blob/dev/src/components/icon-grid/build-icon.js
      parseIconSet(
        await lookupCollection(iconSet.prefix),
        (iconName, iconData) => {
          const svg = iconToSVG(mergeIconData(defaultIconProps, iconData), {
            width: "3em",
          });

          fs.mkdirSync(iconPath, { recursive: true }) ||
            fs.writeFileSync(
              `${iconPath}/${iconName}.svg`,
              iconToHTML(replaceIDs(svg.body, nanoid), svg.attributes)
            );
        }
      );
    })
  );
};

fs.rmSync(dataPath, { force: true, recursive: true }) ||
  (await buildData(
    groupCollections(
      Object.entries(await lookupCollections()).map(([key, value]) => ({
        prefix: key,
        ...value,
      })),
      [
        (iconSet) => (iconSet.palette ? "Multiple colors" : "Monotone"),
        (iconSet) => iconSet.category ?? "Uncategorised",
      ]
    )
  ));
